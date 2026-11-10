import ExcelJS from "exceljs";
import { dec, money, sum } from "./decimal";
import { splitAmount, type BalForEmi, type GridRow, type CommitmentType } from "./commitments";
import { addDays, dayInMonth } from "./text";
import { StatementParseError } from "./parsers/types";

/**
 * The "Balance sheet" layout of the EMI tracking sheet:
 *   A1 "Column1" | Mar … Jan | Total received | Target/EMI amount | Bal to be paid
 *   rows: a person who owes you, savings goals (numbers paid, "NIL" not applicable, empty still to come)
 *   N/O labels: Incoming amount, EMI on card, My Outstanding, other expense, KVB, Bal for EMI
 */

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export interface SheetRow {
  name: string;
  /** yyyy-mm -> paid amount; null = NIL; missing = empty */
  values: Record<string, string | null>;
  target: string | null;
}

export interface ParsedSheet {
  months: string[];
  rows: SheetRow[];
  incoming: string | null;
  emiOnCard: string | null;
  otherExpense: string | null;
  pool: { label: string; amount: string } | null;
}

function cellValue(v: ExcelJS.CellValue): string | number | null {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "object" && "result" in v) return (v.result as number | string | undefined) ?? null;
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("");
  return null;
}

const amountOf = (v: string | number | null): string | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? money(n) : null;
};

/** Reads the sheet. `firstYear` is the year of the first month column (Jan after Dec rolls over). */
export async function parseCommitmentSheet(data: ArrayBuffer | Uint8Array, firstYear: number): Promise<ParsedSheet> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer : data);
  } catch {
    throw new StatementParseError("This Excel file couldn't be read.", "UNREADABLE");
  }
  const ws = wb.worksheets.find((w) => /balance\s*sheet/i.test(w.name)) ?? wb.worksheets[0];
  if (!ws) throw new StatementParseError("The workbook has no sheets.", "UNSUPPORTED");

  // Header: month columns, then Total received / Target / Bal to be paid
  const header = ws.getRow(1);
  const monthCols: { col: number; month: string }[] = [];
  let targetCol = -1;
  let year = firstYear;
  let lastMonth = -1;
  header.eachCell((cell, col) => {
    const label = String(cellValue(cell.value) ?? "").trim().toLowerCase();
    const idx = MONTH_NAMES.indexOf(label.slice(0, 3));
    if (idx >= 0 && label.length <= 9) {
      if (lastMonth >= 0 && idx < lastMonth) year++;
      lastMonth = idx;
      monthCols.push({ col, month: `${year}-${String(idx + 1).padStart(2, "0")}` });
    } else if (/target/.test(label)) targetCol = col;
  });
  if (monthCols.length === 0) throw new StatementParseError("No month columns (Mar, April, …) were found in row 1.", "UNSUPPORTED");

  const rows: SheetRow[] = [];
  const labels: Record<string, string | null> = {};
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const name = String(cellValue(row.getCell(1).value) ?? "").trim();
    if (name) {
      const values: Record<string, string | null> = {};
      for (const { col, month } of monthCols) {
        const v = cellValue(row.getCell(col).value);
        if (v == null || v === "") continue;
        values[month] = /^nil$/i.test(String(v).trim()) ? null : amountOf(v);
      }
      rows.push({ name, values, target: targetCol > 0 ? amountOf(cellValue(row.getCell(targetCol).value)) : null });
    }
    // Label/value pairs anywhere on the row (N5 "Incoming amount" -> O5 24000)
    row.eachCell((cell, col) => {
      const v = cellValue(cell.value);
      if (typeof v === "string" && v.trim() && col !== 1) labels[v.trim().toLowerCase()] = amountOf(cellValue(row.getCell(col + 1).value));
    });
  });

  const find = (re: RegExp) => Object.entries(labels).find(([k]) => re.test(k));
  const poolEntry = find(/^(kvb|pool|available)/);
  return {
    months: monthCols.map((m) => m.month),
    rows,
    incoming: find(/^incoming/)?.[1] ?? null,
    emiOnCard: find(/^emi\s*on\s*card/)?.[1] ?? null,
    otherExpense: find(/^other\s*expense/)?.[1] ?? null,
    pool: poolEntry && poolEntry[1] ? { label: poolEntry[0].toUpperCase(), amount: poolEntry[1] } : null,
  };
}

// ---------------------------------------------------------------------------
// Turning the sheet into commitments (shown as a preview before saving)
// ---------------------------------------------------------------------------

export interface PlannedEntry {
  dueDate: string;
  amount: string;
  paidAmount: string;
}

export interface PlannedCommitment {
  key: string;
  name: string;
  type: CommitmentType;
  totalAmount: string;
  accountId: string | null;
  /** key of the commitment this links to (receivable -> card EMI) */
  linkKey: string | null;
  matchPattern: string | null;
  schedule: PlannedEntry[];
  note: string;
}

export interface SheetPlan {
  commitments: PlannedCommitment[];
  poolBalance: { accountId: string; amount: string; label: string } | null;
}

interface PlanAccount {
  id: string;
  name: string;
  institution: string;
  type: "BANK" | "CREDIT_CARD";
  isPool: boolean;
  dueDay: number | null;
}

const monthDate = (month: string, day: number) => dayInMonth(Number(month.slice(0, 4)), Number(month.slice(5, 7)), day);

export function planFromSheet(sheet: ParsedSheet, accounts: PlanAccount[], today: string): SheetPlan {
  const cards = accounts.filter((a) => a.type === "CREDIT_CARD");
  const emiCard = cards.find((c) => /hdfc/i.test(c.institution) && !/kiwi/i.test(c.name)) ?? cards[0] ?? null;
  const billCard = cards.find((c) => /kiwi/i.test(c.name) || /kiwi/i.test(c.institution)) ?? cards.find((c) => c.id !== emiCard?.id) ?? null;
  const pool = accounts.find((a) => a.isPool && sheet.pool && a.name.toUpperCase().includes(sheet.pool.label)) ?? accounts.find((a) => a.isPool) ?? null;
  const emiDay = emiCard?.dueDay ?? 13;

  const out: PlannedCommitment[] = [];
  let receivableFound = false;

  for (const row of sheet.rows) {
    const target = row.target;
    if (!target) continue;
    const filled = sheet.months.filter((m) => m in row.values);
    const emptyAfter = sheet.months.filter((m) => !(m in row.values) && (!filled.length || m > (filled.at(-1) as string)));

    const isReceivable = !receivableFound && !!sheet.emiOnCard && dec(target).equals(sheet.emiOnCard) && Object.values(row.values).every((v) => v == null);
    if (isReceivable) {
      receivableFound = true;
      const months = emptyAfter.length ? emptyAfter : [today.slice(0, 7)];
      const parts = splitAmount(target, months.length);
      out.push({
        key: "emi",
        name: `${emiCard?.name ?? "Card"} EMI`,
        type: "CARD_EMI",
        totalAmount: target,
        accountId: emiCard?.id ?? null,
        linkKey: null,
        matchPattern: null,
        schedule: months.map((m, i) => ({ dueDate: monthDate(m, emiDay), amount: parts[i], paidAmount: "0.00" })),
        note: `Paid on day ${emiDay}, in ${months.length} parts.`,
      });
      out.push({
        key: `row:${row.name}`,
        name: row.name,
        type: "RECEIVABLE",
        totalAmount: target,
        accountId: pool?.id ?? null,
        linkKey: "emi",
        matchPattern: row.name.toUpperCase(),
        schedule: months.map((m, i) => ({ dueDate: monthDate(m, Math.max(1, emiDay - 1)), amount: parts[i], paidAmount: "0.00" })),
        note: `Pays the EMI: due the day before it, into ${pool?.name ?? "your available-money account"}.`,
      });
      continue;
    }

    // Savings goal: the months already paid, then the last monthly amount until the target is met
    const paid = filled.filter((m) => row.values[m] != null).map((m) => ({ dueDate: monthDate(m, 1), amount: row.values[m] as string, paidAmount: row.values[m] as string }));
    const saved = sum(paid.map((p) => p.amount));
    let left = dec(target).minus(saved);
    const monthly = paid.at(-1)?.amount ?? money(left.dividedBy(Math.max(1, emptyAfter.length)));
    const planned: PlannedEntry[] = [];
    for (const m of emptyAfter) {
      if (left.lessThanOrEqualTo(0)) break;
      const amt = left.lessThan(monthly) ? left : dec(monthly);
      planned.push({ dueDate: monthDate(m, 1), amount: money(amt), paidAmount: "0.00" });
      left = left.minus(amt);
    }
    out.push({
      key: `row:${row.name}`,
      name: row.name,
      type: "SAVINGS_GOAL",
      totalAmount: target,
      accountId: pool?.id ?? null,
      linkKey: null,
      matchPattern: null,
      schedule: [...paid, ...planned],
      note: `Saved ${money(saved)} of ${target}${planned.length ? `; ${planned.length} more month${planned.length > 1 ? "s" : ""} planned` : ""}.`,
    });
  }

  if (sheet.otherExpense) {
    const due = billCard?.dueDay ? nextDue(today, billCard.dueDay) : endOfMonth(today);
    out.push({
      key: "bill",
      name: `${billCard?.name ?? "Card"} bill`,
      type: "CARD_BILL",
      totalAmount: sheet.otherExpense,
      accountId: billCard?.id ?? null,
      linkKey: null,
      matchPattern: null,
      schedule: [{ dueDate: due, amount: sheet.otherExpense, paidAmount: "0.00" }],
      note: "The sheet's \"other expense\".",
    });
  }
  if (sheet.incoming) {
    out.push({
      key: "incoming",
      name: "Incoming amount",
      type: "EXPECTED_INCOME",
      totalAmount: sheet.incoming,
      accountId: null,
      linkKey: null,
      matchPattern: null,
      schedule: [{ dueDate: endOfMonth(today), amount: sheet.incoming, paidAmount: "0.00" }],
      note: "Expected by the end of this month.",
    });
  }

  return {
    commitments: out,
    poolBalance: sheet.pool && pool ? { accountId: pool.id, amount: sheet.pool.amount, label: pool.name } : null,
  };
}

function nextDue(today: string, day: number): string {
  const [y, m] = today.split("-").map(Number);
  const thisMonth = dayInMonth(y, m, day);
  return thisMonth >= today ? thisMonth : dayInMonth(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, day);
}

function endOfMonth(today: string): string {
  const [y, m] = today.split("-").map(Number);
  return addDays(dayInMonth(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1), -1);
}

// ---------------------------------------------------------------------------
// Export back to Excel, in the same layout
// ---------------------------------------------------------------------------

const MONTH_LABEL = ["Jan", "Feb", "Mar", "April", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function commitmentWorkbook(grid: { months: string[]; rows: GridRow[] }, bal: BalForEmi, poolLabel: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Balance sheet");
  const m = grid.months.length;
  ws.addRow(["Column1", ...grid.months.map((mo) => MONTH_LABEL[Number(mo.slice(5)) - 1]), "Total received", "Target/EMI amount", "Bal to be paid"]);
  for (const row of grid.rows) {
    ws.addRow([
      row.name,
      ...row.cells.map((c) => (Number(c.paid) > 0 ? Number(c.paid) : c.entries.length ? null : "NIL")),
      Number(row.totalReceived),
      Number(row.target),
      Number(row.balance),
    ]);
  }
  const labelCol = m + 3; // "Target/EMI amount" column
  const summary: [string, string][] = [
    ["Incoming amount", bal.incoming],
    ["Card EMIs left", money(sum(bal.pairs.map((p) => p.emiRemaining)))],
    ["My Outstanding", bal.myOutstanding],
    ["other expense", bal.bills],
    ["Savings held", bal.savingsHeld],
    [poolLabel, bal.poolMoney],
    ["Bal for EMI", bal.balForEmi],
    ["Cash position", bal.cashPosition],
  ];
  ws.addRow([]);
  for (const [label, value] of summary) {
    const r = ws.addRow([]);
    r.getCell(labelCol).value = label;
    r.getCell(labelCol + 1).value = Number(value);
  }
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c, i) => (c.width = i === 0 ? 14 : 12));
  ws.getColumn(labelCol).width = 20;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
