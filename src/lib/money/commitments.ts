import { dec, maxDec, money, sum, ZERO, type Dec } from "./decimal";

/**
 * Commitments and "Bal for EMI" (plan §7). Pure: amounts in and out are decimal strings.
 *
 *   Pool money         = Σ balances of accounts counted as available money (KVB)
 *   Incoming           = Σ expected income not yet received (+ money owed to you that no EMI is linked to)
 *   Bills              = Σ card bills outstanding + Σ payables remaining (+ card EMIs nobody else is paying)
 *   Savings held       = Σ amount already saved towards savings goals (kept inside the pool)
 *   My outstanding     = for each card EMI linked to a receivable:
 *                        EMI remaining to pay − receivable remaining to collect
 *                        (money already collected from the person but not yet paid to the card)
 *
 *   Bal for EMI        = Pool money + Incoming − (My outstanding + Bills + Savings held)
 *   Fronted for others = Σ over linked pairs of max(0, receivable remaining − EMI remaining)
 *   Cash position      = Bal for EMI − Fronted for others
 *
 * Each payment is counted once (the original spreadsheet subtracted a received amount twice).
 */

export type CommitmentType = "SAVINGS_GOAL" | "CARD_BILL" | "CARD_EMI" | "RECEIVABLE" | "PAYABLE" | "EXPECTED_INCOME";
export type CommitmentStatus = "ACTIVE" | "COMPLETED" | "PAUSED";

export interface ScheduleEntry {
  id: string;
  dueDate: string; // yyyy-mm-dd
  amount: string;
  paidAmount: string;
  paidOn?: string | null;
  transactionId?: string | null;
}

export interface CommitmentInput {
  id: string;
  name: string;
  type: CommitmentType;
  status: CommitmentStatus;
  totalAmount: string;
  linkedCommitmentId?: string | null;
  /** The account the money comes into or goes out of (cards for card bills and EMIs) */
  accountId?: string | null;
  schedule: ScheduleEntry[];
}

export const paidOf = (c: CommitmentInput): Dec => sum(c.schedule.map((s) => s.paidAmount));
export const remainingOf = (c: CommitmentInput): Dec => maxDec(ZERO, dec(c.totalAmount).minus(paidOf(c)));

export interface LinkedPair {
  emi: CommitmentInput;
  receivable: CommitmentInput;
}

/** Card EMIs paired with the receivable that funds them (the link may be stored on either side). */
export function linkedPairs(commitments: CommitmentInput[]): LinkedPair[] {
  const byId = new Map(commitments.map((c) => [c.id, c]));
  const pairs: LinkedPair[] = [];
  const used = new Set<string>();
  for (const c of commitments) {
    if (c.type !== "CARD_EMI" || used.has(c.id)) continue;
    const direct = c.linkedCommitmentId ? byId.get(c.linkedCommitmentId) : undefined;
    const receivable =
      direct?.type === "RECEIVABLE" ? direct : commitments.find((r) => r.type === "RECEIVABLE" && r.linkedCommitmentId === c.id);
    if (receivable && !used.has(receivable.id)) {
      pairs.push({ emi: c, receivable });
      used.add(c.id).add(receivable.id);
    }
  }
  return pairs;
}

export interface BalLine {
  key: string;
  label: string;
  amount: string;
  /** How it enters Bal for EMI */
  sign: "+" | "-";
  items: { id?: string; name: string; amount: string; detail?: string }[];
}

export interface BalForEmi {
  poolMoney: string;
  incoming: string;
  bills: string;
  savingsHeld: string;
  myOutstanding: string;
  balForEmi: string;
  frontedForOthers: string;
  cashPosition: string;
  lines: BalLine[];
  pairs: { emiId: string; receivableId: string; emiName: string; receivableName: string; emiRemaining: string; receivableRemaining: string; myOutstanding: string; fronted: string }[];
}

/**
 * `poolAccountIds`: the accounts counted as available money. Income, money owed either way and
 * savings tied to any other bank account (personal spending money) stay out of Bal for EMI.
 * Card bills and card EMIs always count (they're paid from the pool).
 */
export function computeBalForEmi(input: {
  pool: { id?: string; name: string; balance: string }[];
  commitments: CommitmentInput[];
  poolAccountIds?: string[];
  /** Card spends not on any card bill or EMI yet; they're paid from the pool when the bill comes */
  cardSpends?: { id?: string; name: string; amount: string }[];
}): BalForEmi {
  const poolIds = input.poolAccountIds ? new Set(input.poolAccountIds) : null;
  const counts = (c: CommitmentInput) =>
    c.type === "CARD_BILL" || c.type === "CARD_EMI" || !poolIds || !c.accountId || poolIds.has(c.accountId);
  const live = input.commitments.filter((c) => c.status !== "COMPLETED" && counts(c));
  const pairs = linkedPairs(live);
  const paired = new Set(pairs.flatMap((p) => [p.emi.id, p.receivable.id]));

  const item = (c: CommitmentInput, amount: Dec, detail?: string) => ({ id: c.id, name: c.name, amount: money(amount), detail });

  const poolItems = input.pool.map((a) => ({ id: a.id, name: a.name, amount: money(a.balance) }));
  const incomingItems = [
    ...live.filter((c) => c.type === "EXPECTED_INCOME").map((c) => item(c, remainingOf(c), "Expected income not yet received")),
    ...live.filter((c) => c.type === "RECEIVABLE" && !paired.has(c.id)).map((c) => item(c, remainingOf(c), "Owed to you")),
  ];
  const billItems = [
    ...live.filter((c) => c.type === "CARD_BILL").map((c) => item(c, remainingOf(c), "Card bill outstanding")),
    ...live.filter((c) => c.type === "PAYABLE").map((c) => item(c, remainingOf(c), "You owe")),
    ...live.filter((c) => c.type === "CARD_EMI" && !paired.has(c.id)).map((c) => item(c, remainingOf(c), "Card EMI remaining")),
    ...(input.cardSpends ?? [])
      .filter((s) => dec(s.amount).greaterThan(0))
      .map((s) => ({ id: s.id, name: s.name, amount: money(s.amount), detail: "New card spends, not on a bill yet" })),
  ];
  const savingsItems = live.filter((c) => c.type === "SAVINGS_GOAL").map((c) => item(c, paidOf(c), `Saved of ${money(c.totalAmount)}`));

  const pairRows = pairs.map(({ emi, receivable }) => {
    const emiRemaining = remainingOf(emi);
    const recRemaining = remainingOf(receivable);
    return {
      emiId: emi.id,
      receivableId: receivable.id,
      emiName: emi.name,
      receivableName: receivable.name,
      emiRemaining: money(emiRemaining),
      receivableRemaining: money(recRemaining),
      myOutstanding: money(emiRemaining.minus(recRemaining)),
      fronted: money(maxDec(ZERO, recRemaining.minus(emiRemaining))),
    };
  });

  const poolMoney = sum(poolItems.map((i) => i.amount));
  const incoming = sum(incomingItems.map((i) => i.amount));
  const bills = sum(billItems.map((i) => i.amount));
  const savingsHeld = sum(savingsItems.map((i) => i.amount));
  const myOutstanding = sum(pairRows.map((p) => p.myOutstanding));
  const fronted = sum(pairRows.map((p) => p.fronted));
  const bal = poolMoney.plus(incoming).minus(myOutstanding.plus(bills).plus(savingsHeld));

  return {
    poolMoney: money(poolMoney),
    incoming: money(incoming),
    bills: money(bills),
    savingsHeld: money(savingsHeld),
    myOutstanding: money(myOutstanding),
    balForEmi: money(bal),
    frontedForOthers: money(fronted),
    cashPosition: money(bal.minus(fronted)),
    pairs: pairRows,
    lines: [
      { key: "pool", label: "Available money", amount: money(poolMoney), sign: "+", items: poolItems },
      { key: "incoming", label: "Incoming", amount: money(incoming), sign: "+", items: incomingItems },
      {
        key: "myOutstanding",
        label: "My outstanding on linked EMIs",
        amount: money(myOutstanding),
        sign: "-",
        items: pairRows.map((p) => ({
          id: p.emiId,
          name: `${p.emiName} / ${p.receivableName}`,
          amount: p.myOutstanding,
          detail: `EMI left ${p.emiRemaining} − still to collect ${p.receivableRemaining}`,
        })),
      },
      { key: "bills", label: "Card bills and money you owe", amount: money(bills), sign: "-", items: billItems },
      { key: "savings", label: "Savings held", amount: money(savingsHeld), sign: "-", items: savingsItems },
    ],
  };
}

// ---------------------------------------------------------------------------
// Month grid (plan §7.4): commitments × months, like the Excel sheet
// ---------------------------------------------------------------------------

export interface GridCell {
  month: string; // yyyy-mm
  due: string;
  paid: string;
  entries: ScheduleEntry[];
}

export interface GridRow {
  id: string;
  name: string;
  type: CommitmentType;
  status: CommitmentStatus;
  cells: GridCell[];
  totalReceived: string;
  target: string;
  balance: string;
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ty, tm] = to.slice(0, 7).split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    if (out.length > 120) break;
  }
  return out;
}

/** Totals sum every month column (the Excel SUM stopped at Nov). */
export function buildMonthGrid(commitments: CommitmentInput[], range?: { from: string; to: string }): { months: string[]; rows: GridRow[] } {
  const dates = commitments.flatMap((c) => c.schedule.map((s) => s.dueDate)).sort();
  const months = range ? monthsBetween(range.from, range.to) : dates.length ? monthsBetween(dates[0], dates.at(-1) as string) : [];
  const rows = commitments.map((c) => {
    const cells = months.map((month) => {
      const entries = c.schedule.filter((s) => s.dueDate.startsWith(month));
      return { month, entries, due: money(sum(entries.map((e) => e.amount))), paid: money(sum(entries.map((e) => e.paidAmount))) };
    });
    const received = paidOf(c);
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      cells,
      totalReceived: money(received),
      target: money(c.totalAmount),
      balance: money(maxDec(ZERO, dec(c.totalAmount).minus(received))),
    };
  });
  return { months, rows };
}

/** Splits an amount into n parts in paise; the last part takes the rounding (100 / 3 -> 33.33, 33.33, 33.34). */
export function splitAmount(total: string, parts: number): string[] {
  if (parts <= 0) return [];
  const paise = dec(total).times(100).toDecimalPlaces(0);
  const each = paise.dividedToIntegerBy(parts);
  return Array.from({ length: parts }, (_, i) => (i === parts - 1 ? paise.minus(each.times(parts - 1)) : each).dividedBy(100).toFixed(2));
}

// ---------------------------------------------------------------------------
// Savings goals that pay out (LIC every 6 months, Christmas shopping in December)
// ---------------------------------------------------------------------------

const addMonthsIso = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
};

/**
 * After a repeating goal pays out: the next pay-out `repeatMonths` later, and a fresh schedule
 * setting the target aside in equal monthly parts (on the 1st) up to that month.
 * ₹12,000 paid out on 01 Dec 2026, every 6 months -> next 01 Jun 2027; Jan–Jun 2027, ₹2,000 each.
 */
export function nextPayoutRound(goal: { totalAmount: string; repeatMonths: number; payoutDate: string }): { payoutDate: string; schedule: { dueDate: string; amount: string }[] } {
  const n = Math.max(1, Math.round(goal.repeatMonths));
  const payoutDate = addMonthsIso(goal.payoutDate, n);
  const parts = splitAmount(goal.totalAmount, n);
  return {
    payoutDate,
    schedule: parts.map((amount, i) => ({ dueDate: `${addMonthsIso(goal.payoutDate, i + 1).slice(0, 7)}-01`, amount })),
  };
}
