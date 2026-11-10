import { describe, expect, it } from "vitest";
import { readPdfLines } from "@/lib/money/parsers/pdfText";
import { detectHdfc, parseHdfc } from "@/lib/money/parsers/hdfc";
import { detectKvb, parseKvb } from "@/lib/money/parsers/kvb";
import { validateStatement } from "@/lib/money/parsers/validate";
import { hdfcPdf, kvbPdf, type HdfcRow } from "./statementPdf";

const HDFC_ROWS: HdfcRow[] = [
  { date: "30/10/26", narration: ["UPI-ACCOUNT HOLDER-me@okhdfc-", "KVBL0001234-100000000011-SELF"], ref: "0000100000000011", valueDate: "30/10/26", withdrawal: "4,500.00", balance: "15,500.00" },
  { date: "30/10/26", narration: ["SALARY OCT 2026 ACME TRADERS"], ref: "000000000000000", valueDate: "30/10/26", deposit: "50,000.00", balance: "65,500.00" },
  { date: "31/10/26", narration: ["UPI-SWIGGY-swiggy@icici-ICIC0001-", "100000000055-FOOD"], ref: "0000100000000055", valueDate: "31/10/26", withdrawal: "515.00", balance: "64,985.00" },
  { date: "01/11/26", narration: ["IB BILLPAY DR-HDFC7E1234"], ref: "000000000000000", valueDate: "01/11/26", withdrawal: "12,345.67", balance: "52,639.33" },
];

describe("HDFC statement PDF", () => {
  it("reads rows, wrapped narrations, refs and the summary", async () => {
    const pdf = hdfcPdf({ rows: HDFC_ROWS, from: "30/10/2026", to: "01/11/2026", summary: ["20,000.00", "3", "1", "17,360.67", "50,000.00", "52,639.33"] });
    const pages = await readPdfLines(pdf);
    expect(detectHdfc(pages)).toBe(true);
    expect(detectKvb(pages)).toBe(false);
    const st = parseHdfc(pages);
    expect(st.accountLast4).toBe("1111");
    expect(st.periodFrom).toBe("2026-10-30");
    expect(st.periodTo).toBe("2026-11-01");
    expect(st.openingBalance).toBe("20000.00");
    expect(st.closingBalance).toBe("52639.33");
    expect(st.rows).toHaveLength(4);
    expect(st.rows[0]).toMatchObject({
      txnDate: "2026-10-30",
      refNo: "100000000011",
      amount: "4500.00",
      direction: "DEBIT",
      balanceAfter: "15500.00",
      narration: "UPI-ACCOUNT HOLDER-me@okhdfc- KVBL0001234-100000000011-SELF",
    });
    expect(st.rows[1]).toMatchObject({ refNo: "", direction: "CREDIT", amount: "50000.00" });
    expect(st.rows[3].narration).toBe("IB BILLPAY DR-HDFC7E1234");
    const v = validateStatement(st);
    expect(v.warnings).toEqual([]);
    expect(v.totals).toEqual({ debitCount: 3, creditCount: 1, debits: "17360.67", credits: "50000.00" });
  });

  it("keeps going across pages with repeated headers and footers", async () => {
    const rows: HdfcRow[] = [];
    let bal = 100000;
    for (let i = 0; i < 40; i++) {
      bal -= 10;
      rows.push({ date: "02/11/26", narration: [`UPI-SHOP ${i}-shop${i}@ybl-`, "YESB0000001-1234-PAY"], ref: `00000000${1000 + i}`, valueDate: "02/11/26", withdrawal: "10.00", balance: bal.toLocaleString("en-IN", { minimumFractionDigits: 2 }) });
    }
    const st = parseHdfc(await readPdfLines(hdfcPdf({ rows, perPage: 15, from: "02/11/2026", to: "02/11/2026" })));
    expect(st.rows).toHaveLength(40);
    expect(st.rows.every((r) => !r.narration.includes("HDFC BANK LIMITED"))).toBe(true);
    expect(validateStatement(st).warnings).toEqual([]);
  });

  it("flags a statement whose balances don't add up, but still reads it", async () => {
    const bad = HDFC_ROWS.map((r, i) => (i === 2 ? { ...r, balance: "64,900.00" } : r));
    const st = parseHdfc(await readPdfLines(hdfcPdf({ rows: bad, from: "30/10/2026", to: "01/11/2026" })));
    const v = validateStatement(st);
    expect(v.ok).toBe(false);
    expect(v.warnings.map((w) => w.code)).toContain("BALANCE_MISMATCH");
    expect(st.rows).toHaveLength(4);
  });

  it("asks for a password, rejects a wrong one and opens with the right one", async () => {
    const pdf = hdfcPdf({ rows: HDFC_ROWS, from: "30/10/2026", to: "01/11/2026", password: "TEST1111" });
    await expect(readPdfLines(pdf)).rejects.toMatchObject({ code: "NEEDS_PASSWORD" });
    await expect(readPdfLines(pdf, "nope")).rejects.toMatchObject({ code: "WRONG_PASSWORD" });
    const st = parseHdfc(await readPdfLines(pdf, "TEST1111"));
    expect(st.rows).toHaveLength(4);
  });

  it("rejects a file that isn't a PDF", async () => {
    await expect(readPdfLines(new TextEncoder().encode("date,amount\n"))).rejects.toMatchObject({ code: "UNREADABLE" });
  });
});

describe("KVB statement PDF", () => {
  it("reads the B/F opening, times on the next line, and ignores the watermark", async () => {
    const pdf = kvbPdf({
      opening: "20,000.00",
      openingDate: "01-Sep-2026",
      from: "01-Sep-2026",
      to: "02-Nov-2026",
      rows: [
        { date: "14-Sep-2026", time: "10:42:13", valueDate: "14-Sep-2026", particulars: ["UPI/DR/200000000011/ACCOUNT", "HOLDER-HDFC/me@okhdfc"], ref: "200000000011", debit: "1,200.00", balance: "18,800.00" },
        { date: "01-Nov-2026", time: "09:05:00", valueDate: "01-Nov-2026", particulars: ["UPI/CR/100000000044/ACCOUNT", "HOLDER/HDFC/SELF"], ref: "100000000044", credit: "2,500.00", balance: "21,300.00" },
      ],
    });
    const pages = await readPdfLines(pdf);
    expect(detectKvb(pages)).toBe(true);
    expect(detectHdfc(pages)).toBe(false);
    const st = parseKvb(pages);
    expect(st.accountLast4).toBe("2222");
    expect(st.openingBalance).toBe("20000.00");
    expect(st.closingBalance).toBe("21300.00");
    expect(st.periodFrom).toBe("2026-09-01");
    expect(st.rows).toHaveLength(2);
    expect(st.rows[0]).toMatchObject({ txnDate: "2026-09-14", txnTime: "10:42:13", refNo: "200000000011", direction: "DEBIT", amount: "1200.00" });
    expect(st.rows[0].narration).toBe("UPI/DR/200000000011/ACCOUNT HOLDER-HDFC/me@okhdfc");
    expect(st.rows[1]).toMatchObject({ direction: "CREDIT", amount: "2500.00", txnTime: "09:05:00" });
    expect(st.rows.some((r) => r.narration.includes("KVB"))).toBe(false);
    expect(validateStatement(st).warnings).toEqual([]);
  });
});
