import type { ParsedRow, ParsedStatement, ParseWarning } from "./types";
import { StatementParseError } from "./types";
import { collapseSpaces, parseAmountToken, parseStatementDate, parseTime } from "../text";

/** Splits one CSV line, honouring "quoted, fields" and "" escapes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/**
 * Credit card spends: date,time,merchant,amount,category (header required, any column order,
 * time and category optional). A negative amount is a refund.
 */
export function parseCardCsv(text: string): ParsedStatement {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) throw new StatementParseError("The CSV file is empty.", "UNSUPPORTED");
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iDate = col("date");
  const iTime = col("time");
  const iMerchant = col("merchant");
  const iAmount = col("amount");
  const iCategory = col("category");
  if (iDate < 0 || iMerchant < 0 || iAmount < 0) {
    throw new StatementParseError("The CSV needs a header row with date, merchant and amount columns (time and category are optional).", "UNSUPPORTED");
  }

  const rows: ParsedRow[] = [];
  const warnings: ParseWarning[] = [];
  lines.slice(1).forEach((line, n) => {
    const cells = splitCsvLine(line);
    const txnDate = parseStatementDate(cells[iDate] ?? "");
    const rawAmount = (cells[iAmount] ?? "").replace(/[₹\s]/g, "");
    const amount = parseAmountToken(rawAmount.replace(/^-/, ""));
    const merchant = collapseSpaces(cells[iMerchant] ?? "");
    if (!txnDate || !amount || !merchant || Number(amount) === 0) {
      warnings.push({ code: "ROW_UNREADABLE", row: n, message: `Line ${n + 2} was skipped: it needs a date, a merchant and an amount.` });
      return;
    }
    rows.push({
      txnDate,
      txnTime: iTime >= 0 ? parseTime(cells[iTime] ?? "") : null,
      narration: merchant,
      refNo: "",
      amount,
      direction: rawAmount.startsWith("-") ? "CREDIT" : "DEBIT",
      balanceAfter: null,
      category: iCategory >= 0 ? cells[iCategory] || null : null,
    });
  });

  const dates = rows.map((r) => r.txnDate).sort();
  return {
    source: "CARD_CSV",
    institution: "",
    accountLast4: null,
    periodFrom: dates[0] ?? null,
    periodTo: dates.at(-1) ?? null,
    openingBalance: null,
    closingBalance: null,
    summary: null,
    rows,
    warnings,
  };
}
