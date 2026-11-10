/**
 * Money in the tracker is a decimal string ("1234.50"), never a float: Prisma Decimal on
 * the server, strings in JSON and in the browser. These helpers parse and display it
 * without going through Number.
 */

const MONEY_RE = /^-?\d{1,12}(\.\d{1,2})?$/;

/** "1,23,456.7" / " 1234 " / "₹500" -> "123456.70" / "1234.00" / "500.00"; null when it isn't an amount. */
export function normaliseMoney(input: string | number | null | undefined): string | null {
  if (input == null) return null;
  const raw = String(input).trim().replace(/[₹,\s]/g, "");
  if (!MONEY_RE.test(raw)) return null;
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace("-", "").split(".");
  const digits = whole.replace(/^0+(?=\d)/, "");
  const value = `${digits}.${fraction.padEnd(2, "0")}`;
  return negative && value !== "0.00" ? `-${value}` : value;
}

/** Indian digit grouping for the whole part: 1234567 -> 12,34,567 */
function groupIndian(whole: string): string {
  if (whole.length <= 3) return whole;
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/** "-5500" -> "−₹5,500.00"; "123456.7" -> "₹1,23,456.70". Unparseable input is shown as-is. */
export function formatINR(value: string | null | undefined, { symbol = true }: { symbol?: boolean } = {}): string {
  const normalised = normaliseMoney(value);
  if (normalised == null) return value ?? "";
  const negative = normalised.startsWith("-");
  const [whole, fraction] = normalised.replace("-", "").split(".");
  return `${negative ? "−" : ""}${symbol ? "₹" : ""}${groupIndian(whole)}.${fraction}`;
}

/** "1234" -> "•••• 1234". Only the last 4 digits are ever stored. */
export function maskLast4(last4: string | null | undefined): string {
  return last4 ? `•••• ${last4}` : "";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A calendar date (YYYY-MM-DD or a Date at UTC midnight) as "dd MMM yyyy", with no time-zone shift. */
export function formatMoneyDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const iso = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}
