import { containsLoose, daysBetween } from "./text";

/** Matching engine (plan §6). Pure: works on decrypted rows. */

export type Kind =
  | "EXPENSE" | "INCOME" | "SALARY" | "INTEREST" | "SELF_TRANSFER"
  | "CARD_PAYMENT" | "CARD_REFUND" | "PASS_THROUGH" | "REIMBURSEMENT";

export interface MatchTxn {
  id: string;
  accountId: string;
  txnDate: string;
  amount: string;
  direction: "DEBIT" | "CREDIT";
  refNo: string;
  narration: string;
  kind: Kind;
  linkedTxnId: string | null;
}

export interface MatchAccount {
  id: string;
  type: "BANK" | "CREDIT_CARD";
  ownIdentifiers: string[];
}

/** Kinds a rule decided for good: never treated as one side of a self transfer. */
const NOT_TRANSFERS: Kind[] = ["SALARY", "INTEREST", "CARD_PAYMENT", "CARD_REFUND", "PASS_THROUGH", "REIMBURSEMENT"];

const mentions = (txn: MatchTxn, account: MatchAccount | undefined) =>
  !!account && account.ownIdentifiers.some((id) => containsLoose(txn.narration, id));

/**
 * Pairs a DEBIT in one of your bank accounts with an equal CREDIT in another when their
 * references match (HDFC 0000123456789012 = KVB 123456789012, already normalised), or, failing
 * that, when they're within a day and one narration names the other account. Rows that name
 * another of your accounts but have no other side yet are returned as `unmatched`.
 */
export function matchSelfTransfers(txns: MatchTxn[], accounts: MatchAccount[]): { pairs: [string, string][]; unmatched: string[] } {
  const banks = new Map(accounts.filter((a) => a.type === "BANK").map((a) => [a.id, a]));
  const open = txns.filter((t) => banks.has(t.accountId) && !t.linkedTxnId && !NOT_TRANSFERS.includes(t.kind));
  const used = new Set<string>();
  const pairs: [string, string][] = [];

  const debits = open.filter((t) => t.direction === "DEBIT").sort((a, b) => a.txnDate.localeCompare(b.txnDate));
  const credits = open.filter((t) => t.direction === "CREDIT");

  // 1. Same reference and amount
  const byRef = new Map<string, MatchTxn[]>();
  for (const c of credits) {
    if (c.refNo.length < 6) continue;
    const key = `${c.amount}|${c.refNo}`;
    byRef.set(key, [...(byRef.get(key) ?? []), c]);
  }
  for (const d of debits) {
    if (d.refNo.length < 6) continue;
    const match = (byRef.get(`${d.amount}|${d.refNo}`) ?? []).find((c) => c.accountId !== d.accountId && !used.has(c.id));
    if (match) {
      pairs.push([d.id, match.id]);
      used.add(d.id).add(match.id);
    }
  }

  // 2. Same amount within a day, and one side names the other account
  for (const d of debits) {
    if (used.has(d.id)) continue;
    let best: MatchTxn | null = null;
    for (const c of credits) {
      if (used.has(c.id) || c.accountId === d.accountId || c.amount !== d.amount) continue;
      const gap = Math.abs(daysBetween(d.txnDate, c.txnDate));
      if (gap > 1) continue;
      if (!mentions(d, banks.get(c.accountId)) && !mentions(c, banks.get(d.accountId))) continue;
      if (!best || gap < Math.abs(daysBetween(d.txnDate, best.txnDate))) best = c;
    }
    if (best) {
      pairs.push([d.id, best.id]);
      used.add(d.id).add(best.id);
    }
  }

  const unmatched = open
    .filter((t) => !used.has(t.id) && [...banks.values()].some((a) => a.id !== t.accountId && mentions(t, a)))
    .map((t) => t.id);
  return { pairs, unmatched };
}

/**
 * Money that only passed through you: a credit followed within 2 days by a debit of the same
 * amount. Suggestions only; the first time, you confirm or dismiss each.
 */
export function passThroughSuggestions(txns: MatchTxn[], dismissed: Set<string> = new Set()): { creditId: string; debitId: string }[] {
  const eligible = (t: MatchTxn) => !t.linkedTxnId && (t.kind === "INCOME" || t.kind === "EXPENSE");
  const credits = txns.filter((t) => t.direction === "CREDIT" && eligible(t)).sort((a, b) => a.txnDate.localeCompare(b.txnDate));
  const debits = txns.filter((t) => t.direction === "DEBIT" && eligible(t));
  const used = new Set<string>();
  const out: { creditId: string; debitId: string }[] = [];
  for (const c of credits) {
    const d = debits
      .filter((x) => !used.has(x.id) && x.amount === c.amount && daysBetween(c.txnDate, x.txnDate) >= 0 && daysBetween(c.txnDate, x.txnDate) <= 2)
      .sort((a, b) => a.txnDate.localeCompare(b.txnDate))[0];
    if (!d || dismissed.has(`${c.id}:${d.id}`)) continue;
    out.push({ creditId: c.id, debitId: d.id });
    used.add(d.id);
  }
  return out;
}

export interface ScheduleCandidate {
  scheduleId: string;
  commitmentId: string;
  dueDate: string;
  amount: string;
  /** Payments into you (receivable, expected income) are credits; the rest are debits */
  direction: "DEBIT" | "CREDIT";
  matchPattern: string | null;
}

/**
 * Transactions that look like a commitment payment (plan §6.4): same amount ±1, within 7 days of
 * the due date, and (when the commitment has one) a narration naming the person or UPI ID.
 */
export function scheduleSuggestions(txns: MatchTxn[], entries: ScheduleCandidate[], linkedTxnIds: Set<string>): { scheduleId: string; txnId: string }[] {
  const out: { scheduleId: string; txnId: string }[] = [];
  const used = new Set(linkedTxnIds);
  for (const e of entries) {
    const target = Number(e.amount);
    const match = txns
      .filter((t) => !used.has(t.id) && t.direction === e.direction && t.kind !== "SELF_TRANSFER")
      .filter((t) => Math.abs(Number(t.amount) - target) <= 1 && Math.abs(daysBetween(e.dueDate, t.txnDate)) <= 7)
      .filter((t) => !e.matchPattern || containsLoose(t.narration, e.matchPattern))
      .sort((a, b) => Math.abs(daysBetween(e.dueDate, a.txnDate)) - Math.abs(daysBetween(e.dueDate, b.txnDate)))[0];
    if (match) {
      out.push({ scheduleId: e.scheduleId, txnId: match.id });
      used.add(match.id);
    }
  }
  return out;
}
