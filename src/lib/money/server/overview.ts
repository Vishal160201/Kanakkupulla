import type { MoneyAccount } from "@prisma/client";
import prisma from "@/lib/prisma";
import { dec, money, sum } from "../decimal";
import {
  bankBalance, cardCycles, cardOutstanding, dueDateAfter, cycleFor, forecast, lastWorkingDay, periodReport, salaryCycles,
  type ATxn, type ForecastEvent,
} from "../analytics";
import { buildMonthGrid, computeBalForEmi, linkedPairs, type BalForEmi } from "../commitments";
import { matchSelfTransfers, passThroughSuggestions, type MatchTxn } from "../matching";
import { addDays, daysBetween } from "../text";
import { formatINR, formatMoneyDate } from "../format";
import { loadAccounts, loadCategories, loadCommitments, loadTxns, toAAccount, type CommitmentDTO, type TxnDTO } from "./rows";
import { getPreferences } from "./prefs";
import { todayInIndia } from "../accounts";

/** Shared reads behind the dashboard, cards and commitments pages. */

export const todayIso = () => todayInIndia().toISOString().slice(0, 10);

export interface AccountBalance {
  id: string;
  name: string;
  institution: string;
  type: "BANK" | "CREDIT_CARD";
  last4: string | null;
  color: string;
  isPool: boolean;
  /** Bank: balance. Card: amount used. */
  amount: string | null;
  asOf: string | null;
  source: "statement" | "manual" | "cards" | null;
  creditLimit: string | null;
  lowBalanceAlert: string;
  dueDay: number | null;
}

export function accountBalances(accounts: MoneyAccount[], txns: ATxn[]): AccountBalance[] {
  return accounts.map((a) => {
    const aa = toAAccount(a);
    const base = {
      id: a.id, name: a.name, institution: a.institution, type: a.type, last4: a.last4, color: a.color, isPool: a.isPool,
      creditLimit: aa.creditLimit, lowBalanceAlert: aa.lowBalanceAlert, dueDay: a.dueDay,
    };
    if (a.type === "CREDIT_CARD") {
      const hasData = aa.outstanding != null || txns.some((t) => t.accountId === a.id || t.counterAccountId === a.id);
      return { ...base, amount: hasData ? cardOutstanding(aa, txns) : null, asOf: hasData ? todayIso() : null, source: hasData ? "cards" : null };
    }
    const b = bankBalance(aa, txns);
    return { ...base, amount: b?.balance ?? null, asOf: b?.asOf ?? null, source: b?.source ?? null };
  });
}

export function balForEmiFrom(balances: AccountBalance[], commitments: CommitmentDTO[]): BalForEmi {
  return computeBalForEmi({
    pool: balances.filter((b) => b.type === "BANK" && b.isPool && b.amount != null).map((b) => ({ id: b.id, name: b.name, balance: b.amount as string })),
    commitments,
    poolAccountIds: balances.filter((b) => b.type === "BANK" && b.isPool).map((b) => b.id),
  });
}

export async function commitmentsView(userId: string) {
  const [accounts, txns, commitments] = await Promise.all([loadAccounts(userId), loadTxns(userId), loadCommitments(userId)]);
  const balances = accountBalances(accounts, txns);
  const bal = balForEmiFrom(balances, commitments);
  const grid = buildMonthGrid(commitments.filter((c) => c.schedule.length > 0));
  const txnById = new Map(txns.map((t) => [t.id, t]));
  const linked = commitments.flatMap((c) => c.schedule.filter((s) => s.transactionId).map((s) => txnById.get(s.transactionId as string))).filter(Boolean) as TxnDTO[];
  return { commitments, bal, grid, balances, linkedTxns: linked.map(slimTxn) };
}

export const slimTxn = (t: TxnDTO) => ({ id: t.id, accountId: t.accountId, txnDate: t.txnDate, amount: t.amount, direction: t.direction, narration: t.narration, kind: t.kind });

// ---------------------------------------------------------------------------
// Alerts and forecast (plan §8)
// ---------------------------------------------------------------------------

export interface MoneyAlert {
  id: string;
  level: "danger" | "warning" | "info";
  icon: string;
  title: string;
  detail?: string;
  href?: string;
}

const OUT_TYPES = new Set(["CARD_EMI", "CARD_BILL", "PAYABLE"]);
const remainingOfEntry = (s: { amount: string; paidAmount: string }) => dec(s.amount).minus(s.paidAmount);

function forecastEvents(today: string, days: number, balances: AccountBalance[], commitments: CommitmentDTO[], txns: TxnDTO[], salaryInForecast: boolean): ForecastEvent[] {
  const end = addDays(today, days);
  const events: ForecastEvent[] = [];
  const poolIds = new Set(balances.filter((b) => b.isPool).map((b) => b.id));
  // Savings goals: the saved money leaves on the pay-out date (it was set aside inside the pool)
  for (const c of commitments) {
    if (c.status === "COMPLETED" || c.type !== "SAVINGS_GOAL" || !c.payoutDate || c.payoutDate > end) continue;
    if (c.accountId && !poolIds.has(c.accountId)) continue;
    events.push({ date: c.payoutDate, amount: money(dec(c.totalAmount).negated()), label: `${c.name} pay-out`, kind: "payout" });
  }
  for (const c of commitments) {
    if (c.status === "COMPLETED" || c.type === "SAVINGS_GOAL") continue;
    for (const s of c.schedule) {
      const left = remainingOfEntry(s);
      if (left.lessThanOrEqualTo(0) || s.dueDate > end) continue;
      const inPool = !c.accountId || poolIds.has(c.accountId);
      if (c.type === "PAYABLE" && !inPool) continue;
      if (OUT_TYPES.has(c.type)) events.push({ date: s.dueDate, amount: money(left.negated()), label: c.name, kind: c.type === "CARD_EMI" ? "emi" : c.type === "PAYABLE" ? "payable" : "bill" });
      else if ((c.type === "EXPECTED_INCOME" || c.type === "RECEIVABLE") && inPool)
        events.push({ date: s.dueDate, amount: money(left), label: c.name, kind: c.type === "RECEIVABLE" ? "receivable" : "income" });
    }
  }
  // Card bills with no commitment covering them: the used amount on the next due date
  const covered = new Set(commitments.filter((c) => c.status !== "COMPLETED" && c.accountId && (c.type === "CARD_BILL" || c.type === "CARD_EMI")).map((c) => c.accountId));
  for (const card of balances.filter((b) => b.type === "CREDIT_CARD" && b.dueDay && !covered.has(b.id))) {
    const due = dueDateAfter(addDays(today, -1), card.dueDay);
    if (due && due <= end && card.amount && dec(card.amount).greaterThan(0)) events.push({ date: due, amount: money(dec(card.amount).negated()), label: `${card.name} bill`, kind: "bill" });
  }
  if (salaryInForecast) {
    const lastSalary = txns.filter((t) => t.kind === "SALARY" && t.direction === "CREDIT").at(-1);
    if (lastSalary) {
      let [y, m] = today.split("-").map(Number);
      for (let i = 0; i < 3; i++) {
        const date = lastWorkingDay(y, m);
        if (date >= today && date <= end && daysBetween(lastSalary.txnDate, date) > 20) events.push({ date, amount: lastSalary.amount, label: "Salary (expected)", kind: "salary" });
        m++;
        if (m > 12) { m = 1; y++; }
      }
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function buildAlerts(today: string, dueSoonDays: number, balances: AccountBalance[], commitments: CommitmentDTO[], bal: BalForEmi, unmatched: number, needsReview: number, suggestions: number): MoneyAlert[] {
  const alerts: MoneyAlert[] = [];
  const pool = dec(bal.poolMoney);
  const soonEnd = addDays(today, dueSoonDays);

  // A receivable not in yet, a day before the EMI it pays for
  for (const { emi, receivable } of linkedPairs(commitments.filter((c) => c.status !== "COMPLETED"))) {
    const next = emi.schedule.find((s) => remainingOfEntry(s).greaterThan(0));
    if (!next || daysBetween(today, next.dueDate) > 1) continue;
    const owed = sum(receivable.schedule.filter((s) => s.dueDate <= next.dueDate).map((s) => remainingOfEntry(s)));
    if (owed.lessThanOrEqualTo(0)) continue;
    const part = owed.lessThan(remainingOfEntry(next)) ? owed : remainingOfEntry(next);
    alerts.push({
      id: `recv:${receivable.id}:${next.id}`,
      level: "warning",
      icon: "ph-hourglass-medium",
      title: `${receivable.name}'s ${formatINR(money(part))} not received yet`,
      detail: `Paying ${emi.name} on ${formatMoneyDate(next.dueDate)} will lower your cash position to ${formatINR(money(dec(bal.cashPosition).minus(part)))} until it comes in.`,
      href: "/money/commitments",
    });
  }

  // Card bills and EMIs due soon
  for (const c of commitments) {
    if (c.status === "COMPLETED" || !OUT_TYPES.has(c.type)) continue;
    for (const s of c.schedule) {
      const left = remainingOfEntry(s);
      if (left.lessThanOrEqualTo(0) || s.dueDate > soonEnd) continue;
      const overdue = s.dueDate < today;
      alerts.push({
        id: `due:${s.id}`,
        level: overdue || pool.lessThan(left) ? "danger" : "warning",
        icon: "ph-calendar-warning",
        title: `${c.name}: ${formatINR(money(left))} ${overdue ? "was due" : "due"} on ${formatMoneyDate(s.dueDate)}`,
        detail: pool.lessThan(left) ? `Available money (${formatINR(bal.poolMoney)}) doesn't cover it.` : "Available money covers it.",
        href: "/money/commitments",
      });
    }
  }
  const covered = new Set(commitments.filter((c) => c.status !== "COMPLETED" && c.accountId && OUT_TYPES.has(c.type)).map((c) => c.accountId));
  for (const card of balances.filter((b) => b.type === "CREDIT_CARD" && b.dueDay && b.amount && dec(b.amount).greaterThan(0) && !covered.has(b.id))) {
    const due = dueDateAfter(addDays(today, -1), card.dueDay);
    if (!due || due > soonEnd) continue;
    alerts.push({
      id: `card:${card.id}:${due}`,
      level: pool.lessThan(card.amount as string) ? "danger" : "warning",
      icon: "ph-credit-card",
      title: `${card.name} bill of about ${formatINR(card.amount)} due on ${formatMoneyDate(due)}`,
      detail: pool.lessThan(card.amount as string) ? `Available money (${formatINR(bal.poolMoney)}) doesn't cover it.` : "Available money covers it.",
      href: "/money/cards",
    });
  }

  // Savings goals paying out soon, or already past their pay-out date
  for (const c of commitments) {
    if (c.status === "COMPLETED" || c.type !== "SAVINGS_GOAL" || !c.payoutDate || c.payoutDate > soonEnd) continue;
    const past = c.payoutDate < today;
    alerts.push({
      id: `payout:${c.id}`,
      level: past ? "warning" : pool.lessThan(c.totalAmount) ? "danger" : "info",
      icon: "ph-piggy-bank",
      title: past ? `Has ${c.name} been paid out? It was due on ${formatMoneyDate(c.payoutDate)}` : `${c.name}: ${formatINR(c.totalAmount)} goes out on ${formatMoneyDate(c.payoutDate)}`,
      detail: past
        ? "Mark it paid out on the Commitments page, so the money isn't counted as both spent and saved."
        : pool.lessThan(c.totalAmount) ? `Available money (${formatINR(bal.poolMoney)}) doesn't cover it.` : "Available money covers it.",
      href: "/money/commitments",
    });
  }

  for (const b of balances) {
    if (b.type === "BANK" && b.amount != null && dec(b.amount).lessThan(b.lowBalanceAlert)) {
      alerts.push({ id: `low:${b.id}`, level: "danger", icon: "ph-warning-circle", title: `${b.name} is down to ${formatINR(b.amount)}`, detail: `Below your ${formatINR(b.lowBalanceAlert)} alert.`, href: "/money/settings" });
    }
  }
  if (dec(bal.balForEmi).lessThan(0)) {
    alerts.push({ id: "short", level: "danger", icon: "ph-trend-down", title: `Bal for EMI is ${formatINR(money(dec(bal.balForEmi).abs()))} short`, detail: "Your commitments are more than the money you have and expect.", href: "/money/commitments" });
  }
  if (unmatched > 0) {
    alerts.push({ id: "unmatched", level: "info", icon: "ph-arrows-left-right", title: `${unmatched} transfer${unmatched > 1 ? "s" : ""} between your accounts with no other side yet`, detail: "Import the other account's statement to match them.", href: "/money/transactions?view=unmatched" });
  }
  if (needsReview > 0) {
    alerts.push({ id: "review", level: "warning", icon: "ph-file-magnifying-glass", title: `${needsReview} import${needsReview > 1 ? "s" : ""} need${needsReview > 1 ? "" : "s"} a look`, detail: "Their balances didn't add up.", href: "/money/import" });
  }
  if (suggestions > 0) {
    alerts.push({ id: "suggest", level: "info", icon: "ph-lightbulb", title: `${suggestions} suggestion${suggestions > 1 ? "s" : ""} to review`, detail: "Money that passed through you, or payments that match a commitment.", href: "/money/transactions?view=suggestions" });
  }
  const order = { danger: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

export async function dashboardView(userId: string) {
  const today = todayIso();
  const [accounts, txns, commitments, categories, prefs, needsReview] = await Promise.all([
    loadAccounts(userId), loadTxns(userId), loadCommitments(userId), loadCategories(userId), getPreferences(userId),
    prisma.moneyImport.count({ where: { userId, status: "NEEDS_REVIEW" } }),
  ]);
  const balances = accountBalances(accounts, txns);
  const bal = balForEmiFrom(balances, commitments);
  const banks = accounts.filter((a) => a.type === "BANK");
  const { unmatched } = matchSelfTransfers(txns as MatchTxn[], accounts);
  const dismissed = new Set(prefs.dismissed);
  const suggestions = passThroughSuggestions(txns as MatchTxn[], dismissed).length;

  // This salary cycle (or the last 30 days before the first salary is imported)
  const cycle = salaryCycles(txns, today)[0] ?? { from: addDays(today, -29), to: today, salary: null };
  const report = periodReport(banks.map(toAAccount), txns, cycle.from, cycle.to);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const spending = report.combined.spending.map((s) => {
    const c = s.categoryId ? catById.get(s.categoryId) : undefined;
    return { ...s, name: c?.name ?? "Uncategorised", color: c?.color ?? "#94a3b8", icon: c?.icon ?? "ph-question" };
  });

  const poolStart = { date: today, balance: bal.poolMoney };
  const projection = forecast(poolStart, forecastEvents(today, prefs.forecastDays, balances, commitments, txns, prefs.salaryInForecast), prefs.forecastDays);

  return {
    today,
    balances,
    totalBank: money(sum(balances.filter((b) => b.type === "BANK" && b.amount != null).map((b) => b.amount as string))),
    totalCards: money(sum(balances.filter((b) => b.type === "CREDIT_CARD" && b.amount != null).map((b) => b.amount as string))),
    bal,
    alerts: buildAlerts(today, prefs.dueSoonDays, balances, commitments, bal, unmatched.length, needsReview, suggestions),
    cycle: { from: cycle.from, to: cycle.to, salary: cycle.salary, externalIn: report.combined.externalIn, externalOut: report.combined.externalOut, net: report.combined.net, spending },
    forecast: projection,
    hasTransactions: txns.length > 0,
  };
}

export async function cardsView(userId: string) {
  const today = todayIso();
  const [accounts, txns, categories, prefs] = await Promise.all([loadAccounts(userId), loadTxns(userId), loadCategories(userId), getPreferences(userId)]);
  const balances = accountBalances(accounts, txns);
  const catById = new Map(categories.map((c) => [c.id, { name: c.name, color: c.color }]));
  return accounts
    .filter((a) => a.type === "CREDIT_CARD")
    .map((a) => {
      const aa = toAAccount(a);
      const cycles = cardCycles(aa, txns, today, { largeThreshold: prefs.largeSpendThreshold, count: 6 }).map((c) => ({
        ...c,
        categories: c.categories.map((x) => ({ ...x, name: x.categoryId ? catById.get(x.categoryId)?.name ?? "Uncategorised" : "Uncategorised", color: x.categoryId ? catById.get(x.categoryId)?.color ?? "#94a3b8" : "#94a3b8" })),
      }));
      const payments = txns
        .filter((t) => t.kind === "CARD_PAYMENT" && t.counterAccountId === a.id)
        .slice(-10)
        .reverse()
        .map(slimTxn);
      const current = cycleFor(today, a.cycleStartDay);
      return { account: balances.find((b) => b.id === a.id) as AccountBalance, cycleStartDay: a.cycleStartDay, outstandingAsOf: aa.outstandingAsOf, typedOutstanding: aa.outstanding, currentCycle: current, nextDue: dueDateAfter(current.to, a.dueDay), cycles, payments };
    });
}
