import { dec, money } from "../decimal";
import type { ParsedRow, ParsedStatement, ParseWarning } from "./types";

const TOLERANCE = dec("0.01");

/** Opening balance implied by the first row: its balance with its own amount undone. */
export function openingFromFirstRow(rows: ParsedRow[]): string | null {
  const first = rows[0];
  if (!first?.balanceAfter) return null;
  const b = dec(first.balanceAfter);
  return money(first.direction === "DEBIT" ? b.plus(first.amount) : b.minus(first.amount));
}

/**
 * The running balance is the statement's ground truth: when a row's amount sits in the wrong
 * column (tight layouts), but flipping debit/credit makes the balance add up, flip it.
 */
export function fixDirectionsByBalance(rows: ParsedRow[], opening: string | null): ParsedRow[] {
  let prev = opening == null ? null : dec(opening);
  return rows.map((row) => {
    if (prev == null || row.balanceAfter == null) {
      prev = row.balanceAfter == null ? null : dec(row.balanceAfter);
      return row;
    }
    const bal = dec(row.balanceAfter);
    const asIs = row.direction === "DEBIT" ? prev.minus(row.amount) : prev.plus(row.amount);
    const flipped = row.direction === "DEBIT" ? prev.plus(row.amount) : prev.minus(row.amount);
    prev = bal;
    if (asIs.minus(bal).abs().lessThanOrEqualTo(TOLERANCE)) return row;
    if (flipped.minus(bal).abs().lessThanOrEqualTo(TOLERANCE)) return { ...row, direction: row.direction === "DEBIT" ? "CREDIT" : "DEBIT" };
    return row;
  });
}

export interface ValidationResult {
  ok: boolean;
  warnings: ParseWarning[];
  totals: { debitCount: number; creditCount: number; debits: string; credits: string };
}

/**
 * The three checks every import gets:
 * 1. each row: previous balance − debit + credit = balance (±0.01)
 * 2. totals match the statement's summary block, when it has one
 * 3. opening balance + net movement = closing balance
 */
export function validateStatement(statement: ParsedStatement): ValidationResult {
  const warnings: ParseWarning[] = [...statement.warnings];
  let debits = dec(0);
  let credits = dec(0);
  let debitCount = 0;
  let creditCount = 0;
  let prev = statement.openingBalance == null ? null : dec(statement.openingBalance);

  statement.rows.forEach((row, i) => {
    if (row.direction === "DEBIT") {
      debits = debits.plus(row.amount);
      debitCount++;
    } else {
      credits = credits.plus(row.amount);
      creditCount++;
    }
    if (row.balanceAfter == null) return;
    const bal = dec(row.balanceAfter);
    if (prev != null) {
      const expected = row.direction === "DEBIT" ? prev.minus(row.amount) : prev.plus(row.amount);
      if (expected.minus(bal).abs().greaterThan(TOLERANCE)) {
        warnings.push({
          code: "BALANCE_MISMATCH",
          row: i,
          message: `${row.txnDate}: balance should be ${money(expected)} after this row, but the statement says ${money(bal)}.`,
        });
      }
    }
    prev = bal;
  });

  const s = statement.summary;
  if (s) {
    if (s.drCount !== debitCount || s.crCount !== creditCount) {
      warnings.push({ code: "COUNT_MISMATCH", message: `The statement lists ${s.drCount} debits and ${s.crCount} credits; ${debitCount} and ${creditCount} were read.` });
    }
    if (dec(s.debits).minus(debits).abs().greaterThan(TOLERANCE) || dec(s.credits).minus(credits).abs().greaterThan(TOLERANCE)) {
      warnings.push({ code: "TOTAL_MISMATCH", message: `The statement totals are debits ${s.debits} and credits ${s.credits}; the rows add up to ${money(debits)} and ${money(credits)}.` });
    }
  }

  if (statement.openingBalance != null && statement.closingBalance != null) {
    const expectedClose = dec(statement.openingBalance).minus(debits).plus(credits);
    if (expectedClose.minus(statement.closingBalance).abs().greaterThan(TOLERANCE)) {
      warnings.push({ code: "CLOSING_MISMATCH", message: `Opening ${statement.openingBalance} with these rows gives ${money(expectedClose)}, but the closing balance is ${statement.closingBalance}.` });
    }
  }

  return { ok: warnings.length === 0, warnings, totals: { debitCount, creditCount, debits: money(debits), credits: money(credits) } };
}
