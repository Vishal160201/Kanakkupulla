import type { PdfPage } from "./pdfText";
import { cellText, extractRows, type ColumnSpec } from "./table";
import type { ParsedRow, ParsedStatement, ParseWarning } from "./types";
import { collapseSpaces, normaliseRef, parseAmountToken, parseStatementDate } from "../text";
import { fixDirectionsByBalance, openingFromFirstRow } from "./validate";

const COLUMNS: ColumnSpec[] = [
  { key: "date", header: /^Date$/i },
  { key: "narration", header: /^Narration/i },
  { key: "ref", header: /^Chq\.?\s*\/?\s*Ref/i },
  { key: "valueDate", header: /^Value\s*Dt/i },
  { key: "withdrawal", header: /^Withdrawal/i, numeric: true },
  { key: "deposit", header: /^Deposit/i, numeric: true },
  { key: "balance", header: /^Closing\s*Balance/i, numeric: true },
];

export function detectHdfc(pages: PdfPage[]): boolean {
  const first = pages.slice(0, 2).map((p) => p.text).join("\n");
  return /HDFC\s*BANK/i.test(first) && /Withdrawal\s*Amt/i.test(first) && /Closing\s*Balance/i.test(first);
}

/** HDFC savings statement PDF (Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal | Deposit | Closing Balance). */
export function parseHdfc(pages: PdfPage[]): ParsedStatement {
  const all = pages.map((p) => p.text).join("\n");
  const warnings: ParseWarning[] = [];

  const raw = extractRows(pages, COLUMNS, {
    startKey: "date",
    isRowStart: (cell) => /^\d{2}\/\d{2}\/\d{2,4}$/.test(cell.split(" ")[0] ?? "") && !!parseStatementDate(cell.split(" ")[0]),
    continuationKeys: ["narration", "ref"],
    stopAt: /STATEMENT\s+SUMMARY/i,
  });

  const rows: ParsedRow[] = [];
  raw.forEach((r, i) => {
    const txnDate = parseStatementDate(cellText(r, "date").split(" ")[0]);
    const withdrawal = parseAmountToken(cellText(r, "withdrawal"));
    const deposit = parseAmountToken(cellText(r, "deposit"));
    const balance = parseAmountToken(cellText(r, "balance"));
    if (!txnDate || (!withdrawal && !deposit)) {
      warnings.push({ code: "ROW_UNREADABLE", message: `Row ${i + 1} on page ${r.page + 1} couldn't be read and was skipped.`, row: i });
      return;
    }
    const isDebit = !!withdrawal && Number(withdrawal) !== 0;
    rows.push({
      txnDate,
      valueDate: parseStatementDate(cellText(r, "valueDate")) ?? null,
      narration: collapseSpaces(cellText(r, "narration")),
      refNo: normaliseRef(cellText(r, "ref").replace(/\s+/g, "")),
      amount: (isDebit ? withdrawal : deposit) as string,
      direction: isDebit ? "DEBIT" : "CREDIT",
      balanceAfter: balance,
    });
  });

  const summary = readSummary(all);
  const account = /Account\s*(?:No|Number)\.?[ \t]*:?[ \t]*(\d[\d \t]{5,24})/i.exec(all)?.[1]?.replace(/\s/g, "") ?? null;
  const period = /From\s*:?\s*(\d{2}\/\d{2}\/\d{2,4})\s*To\s*:?\s*(\d{2}\/\d{2}\/\d{2,4})/i.exec(all);

  const opening = summary?.opening ?? openingFromFirstRow(rows);
  const fixed = fixDirectionsByBalance(rows, opening);

  return {
    source: "HDFC_PDF",
    institution: "HDFC Bank",
    accountLast4: account ? account.slice(-4) : null,
    periodFrom: period ? parseStatementDate(period[1]) : rows[0]?.txnDate ?? null,
    periodTo: period ? parseStatementDate(period[2]) : rows.at(-1)?.txnDate ?? null,
    openingBalance: opening,
    closingBalance: summary?.closing ?? rows.at(-1)?.balanceAfter ?? null,
    summary: summary ? { drCount: summary.drCount, crCount: summary.crCount, debits: summary.debits, credits: summary.credits } : null,
    rows: fixed,
    warnings,
  };
}

/** "STATEMENT SUMMARY" block: Opening Balance, Dr Count, Cr Count, Debits, Credits, Closing Bal. */
export function readSummary(text: string) {
  const at = text.search(/STATEMENT\s+SUMMARY/i);
  if (at < 0) return null;
  const tokens = text
    .slice(at)
    .split(/\s+/)
    .map((t) => t.replace(/,/g, ""))
    .filter((t) => /^\d+(\.\d{2})?$/.test(t));
  // Opening (2dp), Dr count (int), Cr count (int), Debits (2dp), Credits (2dp), Closing (2dp)
  for (let i = 0; i + 5 < tokens.length; i++) {
    const [o, dr, cr, d, c, cl] = tokens.slice(i, i + 6);
    if (o.includes(".") && !dr.includes(".") && !cr.includes(".") && d.includes(".") && c.includes(".") && cl.includes(".")) {
      return { opening: Number(o).toFixed(2), drCount: Number(dr), crCount: Number(cr), debits: Number(d).toFixed(2), credits: Number(c).toFixed(2), closing: Number(cl).toFixed(2) };
    }
  }
  return null;
}
