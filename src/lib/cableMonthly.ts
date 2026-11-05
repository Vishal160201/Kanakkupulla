// Cable TV monthly billing: each house pays a fixed amount a month (less for node houses, 0 for free ones).
// Pure rules, shared by the server (adding the charges) and the browser (showing a house's amount).

export interface MonthlyRates {
  /** The usual monthly amount; null = monthly billing is off */
  monthlyFee: number | null;
  /** What node houses pay; null = the usual amount */
  nodeFee: number | null;
}

/** What one house pays a month: its own amount, else the node amount for node houses, else the usual one. */
export function houseFee(rates: MonthlyRates, house: { monthlyFee: number | null; nodeHouse: boolean }): number | null {
  if (rates.monthlyFee === null) return null;
  if (house.monthlyFee !== null) return house.monthlyFee;
  return house.nodeHouse && rates.nodeFee !== null ? rates.nodeFee : rates.monthlyFee;
}

/** "2026-12" → "2027-01" */
export function nextMonth(period: string) {
  const [y, m] = period.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** The months after `last` up to and including `current` ("2026-11", "2027-01" → ["2026-12", "2027-01"]). */
export function monthsToBill(last: string, current: string): string[] {
  const out: string[] = [];
  for (let p = nextMonth(last); p <= current; p = nextMonth(p)) out.push(p);
  return out;
}

/** The months to charge now: any missed since `last` (none before `from`), and always the current one. */
export function monthsToCharge(from: string, last: string | null, current: string): string[] {
  if (current < from) return [];
  const missed = last ? monthsToBill(last, current) : [];
  return [...new Set([...missed, current])].filter((p) => p >= from);
}

const monthKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" });
/** "2026-11" in India time. */
export const toMonth = (d: Date) => monthKey.format(d).slice(0, 7);

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", day: "numeric" });
/** Day of the month in India time. */
export const dayOfMonth = (d: Date) => Number(dayKey.format(d));
/** TCCL is paid on this day; the reminder shows from 3 days before. */
export const TCCL_PAY_DAY = 15;

const label = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
/** "2026-12" → "Dec 2026" */
export const monthLabel = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return label.format(new Date(Date.UTC(y, m - 1, 1)));
};

/**
 * The monthly charges to add for `periods`: the full amount for each house whose box is on, if it's more than 0.
 * Run on every sync, so a house pays the whole month once its box is on at any time in it (joined mid-month,
 * or used and then switched off). A box off all month isn't charged, for now.
 */
export function monthlyChargeRows(rates: MonthlyRates, houses: { id: string; status: string; monthlyFee: number | null; nodeHouse: boolean }[], periods: string[], now: Date) {
  return periods.flatMap((period) =>
    houses.flatMap((h) => {
      const amount = houseFee(rates, h);
      if (h.status !== "Active" || !amount || amount <= 0) return [];
      return [{ subscriberId: h.id, kind: "MONTHLY", period, amount, plan: `Cable TV · ${monthLabel(period)}`, renewedAt: now }];
    })
  );
}
