import type { MoneyAccount } from "@prisma/client";
import type { MoneyAccountDTO } from "@/types/money";

/** Today's calendar date in India, as a Date at UTC midnight (how @db.Date columns are read). */
export function todayInIndia(now = new Date()): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * When a card's used amount was last set: today when it's new or changed, kept when it's
 * unchanged, cleared with the amount.
 */
export function outstandingAsOf(next: string | null, previous?: { outstanding: string | null; outstandingAsOf: Date | null }, now = new Date()): Date | null {
  if (next == null) return null;
  if (previous && previous.outstanding === next && previous.outstandingAsOf) return previous.outstandingAsOf;
  return todayInIndia(now);
}

/** API shape: money as decimal strings, never floats. */
export function serializeAccount(account: MoneyAccount, counts?: { transactions: number; imports: number }): MoneyAccountDTO {
  return {
    id: account.id,
    name: account.name,
    institution: account.institution,
    type: account.type,
    last4: account.last4,
    ownIdentifiers: account.ownIdentifiers,
    isPool: account.isPool,
    lowBalanceAlert: account.lowBalanceAlert.toFixed(2),
    cycleStartDay: account.cycleStartDay,
    dueDay: account.dueDay,
    creditLimit: account.creditLimit?.toFixed(2) ?? null,
    outstanding: account.outstanding?.toFixed(2) ?? null,
    outstandingAsOf: account.outstandingAsOf?.toISOString().slice(0, 10) ?? null,
    manualBalance: account.manualBalance?.toFixed(2) ?? null,
    manualBalanceAsOf: account.manualBalanceAsOf?.toISOString().slice(0, 10) ?? null,
    color: account.color,
    sortOrder: account.sortOrder,
    transactionCount: counts?.transactions ?? 0,
    importCount: counts?.imports ?? 0,
  };
}
