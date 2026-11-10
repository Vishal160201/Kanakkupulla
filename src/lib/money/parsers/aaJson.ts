import type { ParsedRow, ParsedStatement, ParseWarning } from "./types";
import { StatementParseError } from "./types";
import { collapseSpaces, normaliseRef, parseAmountToken } from "../text";
import { openingFromFirstRow } from "./validate";

interface AaTxn {
  txnId?: string;
  type?: string;
  mode?: string;
  amount?: string | number;
  currentBalance?: string | number;
  transactionTimestamp?: string;
  valueDate?: string;
  narration?: string;
  reference?: string;
}

type Obj = Record<string, unknown>;

/** Finds Transactions.Transaction[] anywhere in a ReBIT FI JSON document. */
function findTransactions(node: unknown, depth = 0): { list: AaTxn[]; parent: Obj; transactions: Obj } | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  const obj = node as Obj;
  const t = obj.Transactions ?? obj.transactions;
  if (t && typeof t === "object") {
    const list = (t as Obj).Transaction ?? (t as Obj).transaction;
    if (Array.isArray(list)) return { list: list as AaTxn[], parent: obj, transactions: t as Obj };
  }
  for (const value of Object.values(obj)) {
    const found = findTransactions(value, depth + 1);
    if (found) return found;
  }
  return null;
}

const isoPrefix = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

/**
 * Account Aggregator FI data (ReBIT schema): Transactions.Transaction[] with txnId, type,
 * mode, amount, currentBalance, transactionTimestamp, valueDate, narration, reference.
 */
export function parseAaJson(text: string): ParsedStatement {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new StatementParseError("This JSON file couldn't be read.", "UNREADABLE");
  }
  const found = findTransactions(doc);
  if (!found) throw new StatementParseError("No Transactions.Transaction list was found in this JSON file.", "UNSUPPORTED");

  const rows: ParsedRow[] = [];
  const warnings: ParseWarning[] = [];
  found.list.forEach((t, n) => {
    const ts = String(t.transactionTimestamp ?? "");
    const txnDate = isoPrefix(ts);
    const amount = parseAmountToken(String(t.amount ?? ""));
    const type = String(t.type ?? "").toUpperCase();
    if (!txnDate || !amount || (type !== "DEBIT" && type !== "CREDIT")) {
      warnings.push({ code: "ROW_UNREADABLE", row: n, message: `Transaction ${n + 1} was skipped: it needs a timestamp, an amount and a DEBIT or CREDIT type.` });
      return;
    }
    rows.push({
      txnDate,
      txnTime: /T(\d{2}:\d{2}:\d{2})/.exec(ts)?.[1] ?? null,
      valueDate: isoPrefix(t.valueDate),
      narration: collapseSpaces(String(t.narration ?? t.mode ?? "")) || "(no narration)",
      refNo: normaliseRef(String(t.reference ?? t.txnId ?? "")),
      amount,
      direction: type,
      balanceAfter: t.currentBalance == null ? null : parseAmountToken(String(t.currentBalance)),
    });
  });
  rows.sort((a, b) => (a.txnDate + (a.txnTime ?? "")).localeCompare(b.txnDate + (b.txnTime ?? "")));

  const summary = (found.parent.Summary ?? found.parent.summary) as Obj | undefined;
  const profile = found.parent.Profile as Obj | undefined;
  const masked = String(found.parent.maskedAccNumber ?? profile?.maskedAccNumber ?? "");
  return {
    source: "AA_JSON",
    institution: "",
    accountLast4: /\d{4}$/.exec(masked)?.[0] ?? null,
    periodFrom: isoPrefix(found.transactions.startDate) ?? rows[0]?.txnDate ?? null,
    periodTo: isoPrefix(found.transactions.endDate) ?? rows.at(-1)?.txnDate ?? null,
    openingBalance: openingFromFirstRow(rows),
    closingBalance: rows.at(-1)?.balanceAfter ?? (summary?.currentBalance != null ? parseAmountToken(String(summary.currentBalance)) : null),
    summary: null,
    rows,
    warnings,
  };
}
