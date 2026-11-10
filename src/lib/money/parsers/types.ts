export type ParseWarning = { code: string; message: string; row?: number };

export interface ParsedRow {
  txnDate: string; // yyyy-mm-dd
  txnTime?: string | null; // HH:MM:SS
  valueDate?: string | null;
  narration: string;
  refNo: string; // normalised
  amount: string; // "1234.50", always positive
  direction: "DEBIT" | "CREDIT";
  balanceAfter: string | null;
  /** Card CSV: category name to look up */
  category?: string | null;
}

export type StatementSource = "HDFC_PDF" | "KVB_PDF" | "CARD_CSV" | "AA_JSON";

export interface ParsedStatement {
  source: StatementSource;
  institution: string;
  accountLast4: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
  /** The statement's own totals, when it prints them (HDFC "STATEMENT SUMMARY") */
  summary?: { drCount: number; crCount: number; debits: string; credits: string } | null;
  rows: ParsedRow[];
  warnings: ParseWarning[];
}

export class StatementParseError extends Error {
  constructor(message: string, readonly code: "NEEDS_PASSWORD" | "WRONG_PASSWORD" | "UNSUPPORTED" | "UNREADABLE" = "UNREADABLE") {
    super(message);
    this.name = "StatementParseError";
  }
}
