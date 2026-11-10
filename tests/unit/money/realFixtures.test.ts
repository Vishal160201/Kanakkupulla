import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeBalForEmi } from "@/lib/money/commitments";
import { parseCommitmentSheet, planFromSheet } from "@/lib/money/sheet";
import { readPdfLines } from "@/lib/money/parsers/pdfText";
import { detectHdfc, parseHdfc } from "@/lib/money/parsers/hdfc";
import { detectKvb, parseKvb } from "@/lib/money/parsers/kvb";
import { validateStatement } from "@/lib/money/parsers/validate";

/**
 * Acceptance tests on your own files. Everything personal stays in data/fixtures/ (gitignored):
 * the statements, the commitments sheet, and expected.json with the figures they must give:
 *   { "sheet": { "file", "firstYear", "today", "balForEmi" },
 *     "statements": [{ "source", "periodFrom", "opening", "closing", "totals"?, "debits"? }] }
 * The tests skip when the files aren't there. PDF passwords: MONEY_FIXTURE_PDF_PASSWORD.
 */
const DIR = path.join(process.cwd(), "data/fixtures");
const file = (name: string) => path.join(DIR, name);

interface Expected {
  sheet?: { file: string; firstYear: number; today: string; balForEmi: string };
  statements?: { source: string; periodFrom: string; opening: string; closing: string; debits?: string; totals?: { debitCount: number; creditCount: number; debits: string; credits: string } }[];
}
const expected: Expected = existsSync(file("expected.json")) ? JSON.parse(readFileSync(file("expected.json"), "utf8")) : {};
const pdfs = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".pdf")) : [];
const password = process.env.MONEY_FIXTURE_PDF_PASSWORD;
const sheet = expected.sheet;

describe.skipIf(!sheet || !existsSync(file(sheet.file)))("your commitments sheet", () => {
  it("imports to the sheet's Bal for EMI", async () => {
    const s = sheet as NonNullable<Expected["sheet"]>;
    const parsed = await parseCommitmentSheet(readFileSync(file(s.file)), s.firstYear);
    const plan = planFromSheet(parsed, [
      { id: "pool", name: "Pool", institution: "Pool bank", type: "BANK", isPool: true, dueDay: null },
      { id: "emi", name: "EMI card", institution: "HDFC Bank", type: "CREDIT_CARD", isPool: false, dueDay: 13 },
      { id: "bill", name: "Kiwi", institution: "Yes Bank", type: "CREDIT_CARD", isPool: false, dueDay: null },
    ], s.today);
    const bal = computeBalForEmi({
      pool: [{ name: "Pool", balance: parsed.pool?.amount ?? "0" }],
      commitments: plan.commitments.map((c) => ({
        id: c.key, name: c.name, type: c.type, status: "ACTIVE", totalAmount: c.totalAmount, linkedCommitmentId: c.linkKey,
        schedule: c.schedule.map((x, i) => ({ id: `${c.key}${i}`, ...x })),
      })),
    });
    expect(bal.balForEmi).toBe(s.balForEmi);
  });
});

describe.skipIf(pdfs.length === 0)("your statement PDFs", () => {
  it.each(pdfs)("%s reads and balances", async (name) => {
    const pages = await readPdfLines(readFileSync(file(name)), password);
    const st = detectHdfc(pages) ? parseHdfc(pages) : detectKvb(pages) ? parseKvb(pages) : null;
    expect(st, "not recognised as HDFC or KVB").not.toBeNull();
    if (!st) return;
    const v = validateStatement(st);
    expect(v.warnings).toEqual([]);
    const want = expected.statements?.find((e) => e.source === st.source && e.periodFrom === st.periodFrom);
    if (!want) return;
    expect([st.openingBalance, st.closingBalance]).toEqual([want.opening, want.closing]);
    if (want.totals) expect(v.totals).toEqual(want.totals);
    if (want.debits) expect(v.totals.debits).toBe(want.debits);
  });
});
