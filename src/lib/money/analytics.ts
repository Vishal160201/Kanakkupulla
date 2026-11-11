import { dec, money, sum, ZERO, type Dec } from "./decimal";
import { addDays, dayInMonth, daysBetween } from "./text";
import type { Kind } from "./matching";

/** Balances, reports, card cycles and the forecast (plan §8–9). Pure: decrypted rows in. */

export interface ATxn {
  id: string;
  accountId: string;
  txnDate: string;
  txnTime: string | null;
  seq: number;
  amount: string;
  direction: "DEBIT" | "CREDIT";
  kind: Kind;
  categoryId: string | null;
  balanceAfter: string | null;
  narration: string;
  counterparty: string | null;
  counterAccountId: string | null;
}

export interface AAccount {
  id: string;
  name: string;
  type: "BANK" | "CREDIT_CARD";
  isPool: boolean;
  lowBalanceAlert: string;
  manualBalance: string | null;
  manualBalanceAsOf: string | null;
  outstanding: string | null;
  outstandingAsOf: string | null;
  cycleStartDay: number | null;
  dueDay: number | null;
  creditLimit: string | null;
}

export const byStatementOrder = (a: ATxn, b: ATxn) =>
  a.txnDate.localeCompare(b.txnDate) || a.seq - b.seq || (a.txnTime ?? "").localeCompare(b.txnTime ?? "");

const signed = (t: ATxn): Dec => (t.direction === "CREDIT" ? dec(t.amount) : dec(t.amount).negated());

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

/**
 * Balance at the end of `onOrBefore` (default: latest): the statement's last running balance (or a
 * balance typed in later), plus entries you added yourself after that date. Entries dated on or
 * before it are already in the statement.
 */
export function bankBalance(account: AAccount, txns: ATxn[], onOrBefore?: string): { balance: string; asOf: string; source: "statement" | "manual" } | null {
  const upTo = (t: ATxn) => t.accountId === account.id && (!onOrBefore || t.txnDate <= onOrBefore);
  const own = txns.filter((t) => upTo(t) && t.balanceAfter != null).sort(byStatementOrder);
  const last = own.at(-1);
  const manualUsable = account.manualBalance != null && account.manualBalanceAsOf != null && (!onOrBefore || account.manualBalanceAsOf <= onOrBefore);
  let anchor: { balance: string; asOf: string; source: "statement" | "manual" } | null = null;
  if (manualUsable && (!last || (account.manualBalanceAsOf as string) > last.txnDate)) {
    anchor = { balance: account.manualBalance as string, asOf: account.manualBalanceAsOf as string, source: "manual" };
  } else if (last) {
    anchor = { balance: last.balanceAfter as string, asOf: last.txnDate, source: "statement" };
  } else if (manualUsable) {
    anchor = { balance: account.manualBalance as string, asOf: account.manualBalanceAsOf as string, source: "manual" };
  }
  if (!anchor) return null;
  const later = txns.filter((t) => upTo(t) && t.balanceAfter == null && t.txnDate > (anchor as { asOf: string }).asOf);
  const latestDate = later.reduce((d, t) => (t.txnDate > d ? t.txnDate : d), anchor.asOf);
  return { balance: money(dec(anchor.balance).plus(sum(later.map(signed)))), asOf: latestDate, source: anchor.source };
}

/** Opening balance of a period: the balance just before its first row. */
export function openingBalance(account: AAccount, txns: ATxn[], from: string): string | null {
  const before = bankBalance(account, txns, addDays(from, -1));
  if (before) return before.balance;
  const first = txns.filter((t) => t.accountId === account.id && t.txnDate >= from && t.balanceAfter != null).sort(byStatementOrder)[0];
  return first ? money(dec(first.balanceAfter as string).minus(signed(first))) : null;
}

/** What a card has used now: the amount you typed, plus spends after that date, minus refunds and payments. */
export function cardOutstanding(card: AAccount, txns: ATxn[]): string {
  const since = card.outstandingAsOf;
  const after = (t: ATxn) => !since || t.txnDate > since;
  const spends = sum(txns.filter((t) => t.accountId === card.id && t.direction === "DEBIT" && after(t)).map((t) => t.amount));
  const refunds = sum(txns.filter((t) => t.accountId === card.id && t.direction === "CREDIT" && after(t)).map((t) => t.amount));
  const payments = sum(txns.filter((t) => t.kind === "CARD_PAYMENT" && t.counterAccountId === card.id && t.accountId !== card.id && after(t)).map((t) => t.amount));
  return money(dec(card.outstanding ?? 0).plus(spends).minus(refunds).minus(payments));
}

// ---------------------------------------------------------------------------
// Period / salary cycle report
// ---------------------------------------------------------------------------

export interface PeriodFigures {
  opening: string | null;
  closing: string | null;
  externalIn: string;
  externalOut: string;
  net: string;
  selfIn: string;
  selfOut: string;
  cardBillsPaid: string;
  income: { kind: Kind; amount: string }[];
  spending: { categoryId: string | null; amount: string; count: number }[];
}

function figures(rows: ATxn[]): Omit<PeriodFigures, "opening" | "closing"> {
  const external = rows.filter((t) => t.kind !== "SELF_TRANSFER");
  const ins = external.filter((t) => t.direction === "CREDIT");
  const outs = external.filter((t) => t.direction === "DEBIT");
  const income = new Map<Kind, Dec>();
  for (const t of ins) income.set(t.kind, (income.get(t.kind) ?? ZERO).plus(t.amount));
  const spending = new Map<string, { amount: Dec; count: number }>();
  for (const t of outs.filter((x) => x.kind === "EXPENSE")) {
    const key = t.categoryId ?? "";
    const cur = spending.get(key) ?? { amount: ZERO, count: 0 };
    spending.set(key, { amount: cur.amount.plus(t.amount), count: cur.count + 1 });
  }
  const externalIn = sum(ins.map((t) => t.amount));
  const externalOut = sum(outs.map((t) => t.amount));
  return {
    externalIn: money(externalIn),
    externalOut: money(externalOut),
    net: money(externalIn.minus(externalOut)),
    selfIn: money(sum(rows.filter((t) => t.kind === "SELF_TRANSFER" && t.direction === "CREDIT").map((t) => t.amount))),
    selfOut: money(sum(rows.filter((t) => t.kind === "SELF_TRANSFER" && t.direction === "DEBIT").map((t) => t.amount))),
    cardBillsPaid: money(sum(outs.filter((t) => t.kind === "CARD_PAYMENT").map((t) => t.amount))),
    income: [...income].map(([kind, amount]) => ({ kind, amount: money(amount) })).sort((a, b) => Number(b.amount) - Number(a.amount)),
    spending: [...spending]
      .map(([categoryId, v]) => ({ categoryId: categoryId || null, amount: money(v.amount), count: v.count }))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
  };
}

/**
 * Income, spending by category, self transfers (excluded), card bills paid and net change for
 * your bank accounts between two dates, combined and per account.
 */
export function periodReport(accounts: AAccount[], txns: ATxn[], from: string, to: string) {
  const banks = accounts.filter((a) => a.type === "BANK");
  const inRange = (t: ATxn) => t.txnDate >= from && t.txnDate <= to;
  const perAccount = banks.map((a) => {
    const rows = txns.filter((t) => t.accountId === a.id && inRange(t));
    const opening = openingBalance(a, txns, from);
    const closing = bankBalance(a, txns, to)?.balance ?? opening;
    return { accountId: a.id, name: a.name, opening, closing, ...figures(rows) };
  });
  const combinedRows = txns.filter((t) => banks.some((b) => b.id === t.accountId) && inRange(t));
  const known = perAccount.filter((p) => p.opening != null);
  return {
    from,
    to,
    combined: {
      opening: known.length ? money(sum(known.map((p) => p.opening as string))) : null,
      closing: known.length ? money(sum(known.map((p) => p.closing as string))) : null,
      ...figures(combinedRows),
    } as PeriodFigures,
    perAccount,
  };
}

/** From one salary credit to the day before the next; the latest runs to today. */
export function salaryCycles(txns: ATxn[], today: string): { from: string; to: string; salary: string }[] {
  const salaries = txns.filter((t) => t.kind === "SALARY" && t.direction === "CREDIT").sort(byStatementOrder);
  const dates = [...new Set(salaries.map((s) => s.txnDate))];
  return dates.map((from, i) => ({
    from,
    to: dates[i + 1] ? addDays(dates[i + 1], -1) : today,
    salary: money(sum(salaries.filter((s) => s.txnDate === from).map((s) => s.amount))),
  })).reverse();
}

// ---------------------------------------------------------------------------
// Card cycles (plan §9.2)
// ---------------------------------------------------------------------------

/** The billing cycle containing `date`, for a cycle that starts on `startDay` (calendar month when unset). */
export function cycleFor(date: string, startDay: number | null): { from: string; to: string } {
  const [y, m, d] = date.split("-").map(Number);
  const s = startDay ?? 1;
  const startThis = dayInMonth(y, m, s);
  const from = d >= Number(startThis.slice(8)) ? startThis : dayInMonth(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1, s);
  const [fy, fm] = from.split("-").map(Number);
  const next = dayInMonth(fm === 12 ? fy + 1 : fy, fm === 12 ? 1 : fm + 1, s);
  return { from, to: addDays(next, -1) };
}

/** First `dueDay` after the cycle closes. */
export function dueDateAfter(cycleEnd: string, dueDay: number | null): string | null {
  if (!dueDay) return null;
  const [y, m] = cycleEnd.split("-").map(Number);
  const sameMonth = dayInMonth(y, m, dueDay);
  return sameMonth > cycleEnd ? sameMonth : dayInMonth(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, dueDay);
}

export function cardCycles(card: AAccount, txns: ATxn[], today: string, opts: { largeThreshold: string; count?: number }) {
  const own = txns.filter((t) => t.accountId === card.id);
  const cycles: ReturnType<typeof cycleSummary>[] = [];
  let cursor = cycleFor(today, card.cycleStartDay);
  for (let i = 0; i < (opts.count ?? 6); i++) {
    cycles.push(cycleSummary(card, own, txns, cursor, today, opts.largeThreshold));
    cursor = cycleFor(addDays(cursor.from, -1), card.cycleStartDay);
  }
  return cycles;
}

function cycleSummary(card: AAccount, own: ATxn[], all: ATxn[], cycle: { from: string; to: string }, today: string, largeThreshold: string) {
  const rows = own.filter((t) => t.txnDate >= cycle.from && t.txnDate <= cycle.to);
  const spends = rows.filter((t) => t.direction === "DEBIT");
  const refunds = rows.filter((t) => t.direction === "CREDIT");
  const payments = all.filter((t) => t.kind === "CARD_PAYMENT" && t.counterAccountId === card.id && t.txnDate >= cycle.from && t.txnDate <= cycle.to);
  const merchants = new Map<string, Dec>();
  for (const t of spends) merchants.set(t.narration, (merchants.get(t.narration) ?? ZERO).plus(t.amount));
  const categories = new Map<string, Dec>();
  for (const t of spends) categories.set(t.categoryId ?? "", (categories.get(t.categoryId ?? "") ?? ZERO).plus(t.amount));
  const small = spends.filter((t) => dec(t.amount).lessThanOrEqualTo(largeThreshold));
  const lastDay = today < cycle.to ? today : cycle.to;
  const days = Math.max(1, daysBetween(cycle.from, lastDay) + 1);
  const spendTotal = sum(spends.map((t) => t.amount));
  const refundTotal = sum(refunds.map((t) => t.amount));
  return {
    from: cycle.from,
    to: cycle.to,
    isOpen: today <= cycle.to,
    spends: money(spendTotal),
    refunds: money(refundTotal),
    billEstimate: money(spendTotal.minus(refundTotal)),
    dueDate: dueDateAfter(cycle.to, card.dueDay),
    paymentsMade: money(sum(payments.map((t) => t.amount))),
    count: spends.length,
    avgDailyExcludingLarge: money(sum(small.map((t) => t.amount)).dividedBy(days)),
    topMerchants: [...merchants].map(([name, amount]) => ({ name, amount: money(amount) })).sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5),
    categories: [...categories].map(([categoryId, amount]) => ({ categoryId: categoryId || null, amount: money(amount) })).sort((a, b) => Number(b.amount) - Number(a.amount)),
    largest: [...spends].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5).map((t) => ({ id: t.id, date: t.txnDate, name: t.narration, amount: money(t.amount) })),
  };
}

// ---------------------------------------------------------------------------
// Recurring payments and people (plan §9.3–9.4)
// ---------------------------------------------------------------------------

const keyOf = (t: ATxn) =>
  t.counterparty ?? t.narration.toUpperCase().replace(/[0-9]+/g, "").replace(/[^A-Z ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 24);

/** Payments repeated in 3+ different months at a similar amount (±15% of the typical amount). */
export function recurringPayments(txns: ATxn[]) {
  const groups = new Map<string, ATxn[]>();
  for (const t of txns) {
    if (t.direction !== "DEBIT" || t.kind === "SELF_TRANSFER" || t.kind === "CARD_PAYMENT") continue;
    const key = keyOf(t);
    if (key.length < 3) continue;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const out: { name: string; typicalAmount: string; usualDay: number; months: number; count: number; lastDate: string; total: string }[] = [];
  for (const [name, rows] of groups) {
    const amounts = rows.map((r) => Number(r.amount)).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const similar = rows.filter((r) => Math.abs(Number(r.amount) - median) <= median * 0.15);
    const months = new Set(similar.map((r) => r.txnDate.slice(0, 7)));
    if (months.size < 3) continue;
    const days = similar.map((r) => Number(r.txnDate.slice(8))).sort((a, b) => a - b);
    out.push({
      name,
      typicalAmount: money(median),
      usualDay: days[Math.floor(days.length / 2)],
      months: months.size,
      count: similar.length,
      lastDate: similar.map((r) => r.txnDate).sort().at(-1) as string,
      total: money(sum(similar.map((r) => r.amount))),
    });
  }
  return out.sort((a, b) => b.months - a.months || Number(b.typicalAmount) - Number(a.typicalAmount));
}

/** Money sent to and received from each person or payee, with the net. */
export function peopleLedger(txns: ATxn[]) {
  const skip: Kind[] = ["SELF_TRANSFER", "CARD_PAYMENT", "CARD_REFUND", "SALARY", "INTEREST"];
  const people = new Map<string, { sent: Dec; received: Dec; count: number; last: string }>();
  for (const t of txns) {
    if (!t.counterparty || skip.includes(t.kind)) continue;
    const cur = people.get(t.counterparty) ?? { sent: ZERO, received: ZERO, count: 0, last: "" };
    if (t.direction === "DEBIT") cur.sent = cur.sent.plus(t.amount);
    else cur.received = cur.received.plus(t.amount);
    cur.count++;
    if (t.txnDate > cur.last) cur.last = t.txnDate;
    people.set(t.counterparty, cur);
  }
  return [...people]
    .map(([name, p]) => ({ name, sent: money(p.sent), received: money(p.received), net: money(p.received.minus(p.sent)), count: p.count, lastDate: p.last }))
    .sort((a, b) => Number(b.sent) + Number(b.received) - (Number(a.sent) + Number(a.received)));
}

// ---------------------------------------------------------------------------
// Forecast (plan §8)
// ---------------------------------------------------------------------------

export interface ForecastEvent {
  date: string;
  amount: string; // signed: + money in, − money out
  label: string;
  kind: "emi" | "bill" | "receivable" | "income" | "salary" | "payable" | "payout";
}

/** Day-by-day projected available money; events before today land today. */
export function forecast(start: { date: string; balance: string }, events: ForecastEvent[], days: number) {
  const end = addDays(start.date, days);
  let bal = dec(start.balance);
  const points: { date: string; balance: string; events: ForecastEvent[] }[] = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(start.date, i);
    const today = events.filter((e) => (i === 0 ? e.date <= date : e.date === date) && e.date <= end);
    bal = bal.plus(sum(today.map((e) => e.amount)));
    points.push({ date, balance: money(bal), events: today });
  }
  const lowest = points.reduce((lo, p) => (Number(p.balance) < Number(lo.balance) ? p : lo), points[0]);
  return { points, lowest: { date: lowest.date, balance: lowest.balance } };
}

/** Last Monday–Friday of a month (salary usually lands then). */
export function lastWorkingDay(year: number, month1: number): string {
  const d = new Date(Date.UTC(year, month1, 0));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
