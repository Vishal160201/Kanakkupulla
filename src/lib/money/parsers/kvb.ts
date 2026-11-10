import type { PdfPage } from "./pdfText";
import { cellText, extractRows, type ColumnSpec } from "./table";
import type { ParsedRow, ParsedStatement, ParseWarning } from "./types";
import { collapseSpaces, normaliseRef, parseAmountToken, parseStatementDate, parseTime } from "../text";
import { fixDirectionsByBalance, openingFromFirstRow } from "./validate";

const COLUMNS: ColumnSpec[] = [
  { key: "date", header: /^Txn\s*Date/i },
  { key: "valueDate", header: /^Value\s*Date/i },
  { key: "particulars", header: /^Particulars/i },
  { key: "ref", header: /^Ref\.?\s*No/i },
  { key: "debit", header: /^Debit/i, numeric: true },
  { key: "credit", header: /^Credit/i, numeric: true },
  { key: "balance", header: /^Balance/i, numeric: true },
];

const DATE_RE = /^\d{2}-[A-Za-z]{3}-\d{4}$/;

export function detectKvb(pages: PdfPage[]): boolean {
  const first = pages.slice(0, 2).map((p) => p.text).join("\n");
  return /(Karur\s*Vysya|\bKVB\b)/i.test(first) && /Particulars/i.test(first) && /Txn\s*Date/i.test(first);
}

/** KVB savings statement PDF (Txn Date + time | Value Date | Particulars | Ref. No. | Debit | Credit | Balance). */
export function parseKvb(pages: PdfPage[]): ParsedStatement {
  const all = pages.map((p) => p.text).join("\n");
  const warnings: ParseWarning[] = [];

  const raw = extractRows(pages, COLUMNS, {
    startKey: "date",
    isRowStart: (cell) => DATE_RE.test(cell.split(" ")[0] ?? ""),
    continuationKeys: ["date", "valueDate", "particulars", "ref"],
  });

  let opening: string | null = null;
  const rows: ParsedRow[] = [];
  raw.forEach((r, i) => {
    const dateParts = cellText(r, "date").split(" ");
    const txnDate = parseStatementDate(dateParts[0]);
    const txnTime = dateParts.slice(1).map(parseTime).find(Boolean) ?? null;
    const particulars = collapseSpaces(cellText(r, "particulars"));
    const balance = parseAmountToken(cellText(r, "balance"));
    // First row "B/F ..." carries the opening balance, not a transaction
    if (/^B\s*\/\s*F/i.test(particulars)) {
      opening = balance;
      return;
    }
    const debit = parseAmountToken(cellText(r, "debit"));
    const credit = parseAmountToken(cellText(r, "credit"));
    if (!txnDate || (!debit && !credit)) {
      warnings.push({ code: "ROW_UNREADABLE", message: `Row ${i + 1} on page ${r.page + 1} couldn't be read and was skipped.`, row: i });
      return;
    }
    const isDebit = !!debit && Number(debit) !== 0;
    rows.push({
      txnDate,
      txnTime,
      valueDate: parseStatementDate(cellText(r, "valueDate").split(" ")[0]) ?? null,
      narration: particulars,
      refNo: normaliseRef(cellText(r, "ref").replace(/\s+/g, "")),
      amount: (isDebit ? debit : credit) as string,
      direction: isDebit ? "DEBIT" : "CREDIT",
      balanceAfter: balance,
    });
  });

  const account = /Account\s*(?:No|Number)\.?\s*:?\s*(\d[\d\s]{5,})/i.exec(all)?.[1]?.replace(/\s/g, "") ?? null;
  const period = /(\d{2}-[A-Za-z]{3}-\d{4})\s*(?:to|-|–)\s*(\d{2}-[A-Za-z]{3}-\d{4})/i.exec(all);
  if (opening == null) opening = openingFromFirstRow(rows);

  return {
    source: "KVB_PDF",
    institution: "Karur Vysya Bank",
    accountLast4: account ? account.slice(-4) : null,
    periodFrom: period ? parseStatementDate(period[1]) : rows[0]?.txnDate ?? null,
    periodTo: period ? parseStatementDate(period[2]) : rows.at(-1)?.txnDate ?? null,
    openingBalance: opening,
    closingBalance: rows.at(-1)?.balanceAfter ?? opening,
    summary: null,
    rows: fixDirectionsByBalance(rows, opening),
    warnings,
  };
}
