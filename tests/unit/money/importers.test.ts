import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCardCsv, splitCsvLine } from "@/lib/money/parsers/cardCsv";
import { parseAaJson } from "@/lib/money/parsers/aaJson";
import { validateStatement } from "@/lib/money/parsers/validate";

describe("card CSV", () => {
  it("splits quoted fields", () => {
    expect(splitCsvLine('2026-11-01,"10:00","Café, ""Ooty""",250,Food')).toEqual(["2026-11-01", "10:00", 'Café, "Ooty"', "250", "Food"]);
  });

  it("reads spends and refunds in any column order", () => {
    const st = parseCardCsv('merchant,amount,date,time,category\nSWIGGY,"1,250.50",01/11/2026,8:05 PM,Food & Drinks\nAMAZON REFUND,-499,2026-11-02,,\n,100,2026-11-03,,\n');
    expect(st.rows).toEqual([
      { txnDate: "2026-11-01", txnTime: "20:05:00", narration: "SWIGGY", refNo: "", amount: "1250.50", direction: "DEBIT", balanceAfter: null, category: "Food & Drinks" },
      { txnDate: "2026-11-02", txnTime: null, narration: "AMAZON REFUND", refNo: "", amount: "499.00", direction: "CREDIT", balanceAfter: null, category: null },
    ]);
    expect(st.warnings).toHaveLength(1);
  });

  it("needs the core columns", () => {
    expect(() => parseCardCsv("when,what\n1,2")).toThrow(/date, merchant and amount/);
  });
});

describe("Account Aggregator JSON", () => {
  it("maps ReBIT FI transactions and checks their balances", () => {
    const st = parseAaJson(readFileSync(path.join(__dirname, "aa-sample.json"), "utf8"));
    expect(st.accountLast4).toBe("2222");
    expect(st.periodFrom).toBe("2026-09-01");
    expect(st.rows.map((r) => [r.txnDate, r.direction, r.amount, r.refNo])).toEqual([
      ["2026-09-14", "DEBIT", "1200.00", "200000000011"],
      ["2026-11-01", "CREDIT", "2500.00", "100000000044"],
    ]);
    expect(st.openingBalance).toBe("20000.00");
    expect(st.closingBalance).toBe("21300.00");
    expect(st.warnings).toHaveLength(1);
    expect(validateStatement({ ...st, warnings: [] }).ok).toBe(true);
  });

  it("rejects JSON without transactions", () => {
    expect(() => parseAaJson('{"a":1}')).toThrow(/Transactions/);
    expect(() => parseAaJson("{")).toThrow(/couldn't be read/);
  });
});
