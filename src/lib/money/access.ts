/**
 * Who can open the personal money tracker (/money, /api/money): one account, named by
 * MONEY_TRACKER_EMAIL. Read on the server only, so the address never reaches the browser
 * bundle; the client just sees `session.user.moneyTracker`. Falls back to the older
 * NEXT_PUBLIC_PERSONAL_TRACKER_EMAIL so an existing deployment keeps working.
 *
 * No database access here: the proxy imports this.
 */
export function moneyTrackerEmail(): string | null {
  const email = (process.env.MONEY_TRACKER_EMAIL || process.env.NEXT_PUBLIC_PERSONAL_TRACKER_EMAIL || "").trim().toLowerCase();
  return email || null;
}

export function canUseMoneyTracker(email: string | null | undefined): boolean {
  const allowed = moneyTrackerEmail();
  return !!allowed && !!email && email.trim().toLowerCase() === allowed;
}
