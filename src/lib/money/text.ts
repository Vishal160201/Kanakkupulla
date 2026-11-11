/** Text helpers shared by the statement parsers, the matching engine and rules. Pure. */

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** dd/mm/yy, dd/mm/yyyy, dd-mm-yyyy, dd-MON-yyyy, yyyy-mm-dd -> yyyy-mm-dd; null otherwise. */
export function parseStatementDate(raw: string): string | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return validDate(m[1], m[2], m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (m) return validDate(m[3].length === 2 ? `20${m[3]}` : m[3], m[2].padStart(2, "0"), m[1].padStart(2, "0"));
  m = /^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s-,]+(\d{2}|\d{4})$/.exec(s);
  if (m && MONTHS[m[2].toUpperCase()]) return validDate(m[3].length === 2 ? `20${m[3]}` : m[3], MONTHS[m[2].toUpperCase()], m[1].padStart(2, "0"));
  return null;
}

function validDate(y: string, mo: string, d: string): string | null {
  const iso = `${y}-${mo}-${d}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** "HH:MM" or "HH:MM:SS" -> "HH:MM:SS"; null otherwise. */
export function parseTime(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(raw.trim());
  if (!m) return null;
  let h = Number(m[1]);
  if (m[4]) h = (h % 12) + (m[4].toUpperCase() === "PM" ? 12 : 0);
  if (h > 23 || Number(m[2]) > 59 || Number(m[3] ?? 0) > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
}

/** Strips leading zeros; an all-zero reference ("000000000000000") is no reference. */
export function normaliseRef(raw: string | null | undefined): string {
  const s = (raw ?? "").replace(/\s+/g, "").toUpperCase();
  if (!s || /^0+$/.test(s) || /^[-–—.]+$/.test(s)) return "";
  return s.replace(/^0+(?=.)/, "");
}

/** "1,23,456.78" / "1234.5 Cr" -> "123456.78"; null when it isn't an amount. */
export function parseAmountToken(raw: string): string | null {
  const s = raw.trim().replace(/\s*(CR|DR|Cr|Dr|cr|dr)\.?$/, "").replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  return `${w}.${f.padEnd(2, "0")}`;
}

export const isAmountToken = (raw: string) => /^-?[\d,]+\.\d{2}(\s*(CR|DR)\.?)?$/i.test(raw.trim());

export const collapseSpaces = (s: string) => s.replace(/\s+/g, " ").trim();

/** Case- and space-insensitive "contains" used by rules and own-identifier checks. */
export function containsLoose(haystack: string, needle: string): boolean {
  const n = needle.replace(/\s+/g, "").toUpperCase();
  return n.length > 0 && haystack.replace(/\s+/g, "").toUpperCase().includes(n);
}

const UPI_ID = /[A-Za-z0-9._]{2,}@[A-Za-z][A-Za-z0-9.]{1,}/;

/**
 * Best-effort counterparty and UPI ID from a bank narration:
 * HDFC  "UPI-ARUN KUMAR-arun@okaxis-UTIB0001234-123456789012-EMI"
 * KVB   "UPI/CR/123456789012/ARUN KUMAR/UTIB/arun@okaxis/EMI"
 * NEFT  "NEFT CR-UTIB0000123-ACME TRADERS PVT LTD-HOLDER-UTIBN123"
 * IMPS  "IMPS-123456789012-ARUN KUMAR-UTIB-XXXXXXXX1234-EMI"
 */
export function extractCounterparty(narration: string): { counterparty: string | null; upiId: string | null } {
  const text = collapseSpaces(narration);
  const upiId = UPI_ID.exec(text)?.[0]?.toLowerCase() ?? null;
  let counterparty: string | null = null;

  // "UPI-AUTOPAY-APPLE MEDIA SERVICES-…": the payee comes after AUTOPAY / MANDATE
  let m = /^UPI-(?:(?:AUTOPAY|MANDATE|COLLECT)-)?([^-]+)-/i.exec(text);
  if (m) counterparty = m[1];
  if (!counterparty && (m = /^UPI\/(?:DR|CR|P2A|P2M)?\/?\d*\/([^/]+)\//i.exec(text))) counterparty = m[1];
  if (!counterparty && (m = /^(?:NEFT|RTGS)\s*(?:CR|DR)?-[A-Z]{4}0[A-Z0-9]{6}-([^-]+)-/i.exec(text))) counterparty = m[1];
  if (!counterparty && (m = /^IMPS-\d+-([^-]+)-/i.exec(text))) counterparty = m[1];
  if (!counterparty && (m = /^POS\s+\S+\s+(.+?)(?:\s+POS DEBIT)?$/i.exec(text))) counterparty = m[1];

  counterparty = counterparty ? collapseSpaces(counterparty).toUpperCase() : null;
  if (counterparty && /^\d+$/.test(counterparty)) counterparty = null;
  return { counterparty, upiId };
}

/** Whole days between two yyyy-mm-dd dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** yyyy-mm-dd for a day-of-month in a given month, clamped to the month's length (31 -> 30 Nov). */
export function dayInMonth(year: number, month1: number, day: number): string {
  const last = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  return `${year}-${String(month1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const dateFromIso = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
