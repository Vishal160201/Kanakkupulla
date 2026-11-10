import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildMonthGrid, computeBalForEmi, type CommitmentInput } from "@/lib/money/commitments";
import { commitmentWorkbook, parseCommitmentSheet, planFromSheet } from "@/lib/money/sheet";

/** A made-up sheet in the same layout as the real one (same cells and formulas, different figures). */
async function sampleSheet(): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Balance sheet");
  ws.addRow(["Column1", "Mar", "April", "May ", "June", "Jul", "Aug ", "Sep", "Oct", "Nov", "Dec", "Jan", "Total received", "Target/EMI amount", "Bal to be paid"]);
  ws.addRow(["Arun", "NIL", "NIL", "NIL", "NIL", "NIL", "NIL", "NIL", "NIL", null, null, null, null, 10000, { formula: "N2-M2", result: 10000 }]);
  ws.addRow(["Insurance", "NIL", "NIL", "NIL", 2000, 2000, 2000, 2000, 2000, null, null, null, { formula: "SUM(E3:J3)", result: 10000 }, 12000, { formula: "N3-M3", result: 2000 }]);
  ws.addRow(["Festival", 1500, 1500, null, 500, 500, 500, 500, 500, null, null, null, { formula: "SUM(B4:J4)", result: 5500 }, 7000, { formula: "N4-M4", result: 1500 }]);
  const put = (r: number, label: string, value: number | { formula: string; result: number }) => {
    ws.getCell(`N${r}`).value = label;
    ws.getCell(`O${r}`).value = value;
  };
  put(5, "Incoming amount", 15000);
  put(6, "EMI on card", 10000);
  put(7, "My Outstanding", { formula: "O6-O2", result: 0 });
  put(8, "other expense", 30000);
  put(10, "KVB", 25000);
  put(11, "Bal for EMI", { formula: "O5+O10-(O7+O8+O9+M3+M4+M2)", result: -5500 });
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

const accounts = [
  { id: "bank1", name: "HDFC savings", institution: "HDFC Bank", type: "BANK" as const, isPool: false, dueDay: null },
  { id: "pool", name: "KVB savings", institution: "Karur Vysya Bank", type: "BANK" as const, isPool: true, dueDay: null },
  { id: "cc1", name: "Main CC", institution: "HDFC Bank", type: "CREDIT_CARD" as const, isPool: false, dueDay: 13 },
  { id: "cc2", name: "Kiwi", institution: "Yes Bank", type: "CREDIT_CARD" as const, isPool: false, dueDay: 20 },
];

const asInputs = (plan: ReturnType<typeof planFromSheet>): CommitmentInput[] =>
  plan.commitments.map((c) => ({
    id: c.key, name: c.name, type: c.type, status: "ACTIVE", totalAmount: c.totalAmount,
    linkedCommitmentId: c.linkKey, schedule: c.schedule.map((s, i) => ({ id: `${c.key}${i}`, ...s })),
  }));

describe("commitments sheet import", () => {
  it("reads months Mar→Jan, rows and the summary cells", async () => {
    const sheet = await parseCommitmentSheet(await sampleSheet(), 2026);
    expect(sheet.months[0]).toBe("2026-03");
    expect(sheet.months.at(-1)).toBe("2027-01");
    expect(sheet.rows.map((r) => [r.name, r.target])).toEqual([["Arun", "10000.00"], ["Insurance", "12000.00"], ["Festival", "7000.00"]]);
    expect(sheet.rows[2].values["2026-05"]).toBeUndefined();
    expect(sheet.rows[0].values["2026-03"]).toBeNull();
    expect(sheet).toMatchObject({ incoming: "15000.00", emiOnCard: "10000.00", otherExpense: "30000.00", pool: { label: "KVB", amount: "25000.00" } });
  });

  it("plans commitments that give the sheet's Bal for EMI", async () => {
    const plan = planFromSheet(await parseCommitmentSheet(await sampleSheet(), 2026), accounts, "2026-11-10");
    const byName = Object.fromEntries(plan.commitments.map((c) => [c.name, c]));
    expect(byName["Arun"]).toMatchObject({ type: "RECEIVABLE", linkKey: "emi", accountId: "pool" });
    expect(byName["Arun"].schedule.map((s) => [s.dueDate, s.amount])).toEqual([["2026-11-12", "3333.33"], ["2026-12-12", "3333.33"], ["2027-01-12", "3333.34"]]);
    expect(byName["Main CC EMI"].schedule.map((s) => s.dueDate)).toEqual(["2026-11-13", "2026-12-13", "2027-01-13"]);
    expect(byName["Insurance"].schedule.filter((s) => s.paidAmount === "0.00").map((s) => [s.dueDate, s.amount])).toEqual([["2026-11-01", "2000.00"]]);
    expect(byName["Festival"].schedule.filter((s) => s.paidAmount === "0.00").map((s) => s.dueDate)).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
    expect(byName["Kiwi bill"]).toMatchObject({ type: "CARD_BILL", accountId: "cc2", totalAmount: "30000.00" });
    expect(plan.poolBalance).toEqual({ accountId: "pool", amount: "25000.00", label: "KVB savings" });

    const commitments = asInputs(plan);
    expect(computeBalForEmi({ pool: [{ name: "KVB", balance: "25000" }], commitments }).balForEmi).toBe("-5500.00");
    // Totals count every month column through Jan
    expect(buildMonthGrid(commitments).rows.find((r) => r.name === "Festival")).toMatchObject({ totalReceived: "5500.00", target: "7000.00", balance: "1500.00" });
  });

  it("exports the grid back in the same layout", async () => {
    const commitments = asInputs(planFromSheet(await parseCommitmentSheet(await sampleSheet(), 2026), accounts, "2026-11-10"));
    const grid = buildMonthGrid(commitments, { from: "2026-03-01", to: "2027-01-01" });
    const bal = computeBalForEmi({ pool: [{ name: "KVB", balance: "25000" }], commitments });
    const buf = await commitmentWorkbook(grid, bal, "KVB");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const ws = wb.getWorksheet("Balance sheet");
    expect(ws?.getCell("B1").value).toBe("Mar");
    expect(ws?.getCell("L1").value).toBe("Jan");
    expect(ws?.getCell("M1").value).toBe("Total received");
    const values: Record<string, unknown> = {};
    ws?.eachRow((r) => {
      const label = r.getCell(14).value;
      if (typeof label === "string") values[label] = r.getCell(15).value;
    });
    expect(values["Bal for EMI"]).toBe(-5500);
    expect(values["KVB"]).toBe(25000);
  });
});
