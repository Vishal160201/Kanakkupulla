import type { CableSubscriberRow } from "@/types/cable";

const DAY = 86_400_000;

/** Whole days from now until `iso` (negative once past); null without a date. */
export function daysUntil(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - now) / DAY);
}

export type ExpiryState = "gone" | "expired" | "soon" | "ok" | "unknown";

/** Subscribers whose plan runs out within this many days count as "expiring soon". */
export const SOON_DAYS = 7;

export function expiryState(s: Pick<CableSubscriberRow, "expiresAt" | "goneAt">, now = Date.now()): ExpiryState {
  if (s.goneAt) return "gone";
  const days = daysUntil(s.expiresAt, now);
  if (days === null) return "unknown";
  if (new Date(s.expiresAt!).getTime() < now) return "expired";
  return days < SOON_DAYS ? "soon" : "ok";
}

export function expiryLabel(iso: string | null, now = Date.now()): string {
  const days = daysUntil(iso, now);
  if (days === null) return "No expiry date";
  if (new Date(iso!).getTime() < now) {
    const ago = Math.max(1, Math.ceil((now - new Date(iso!).getTime()) / DAY));
    return `Expired ${ago === 1 ? "yesterday" : `${ago} days ago`}`;
  }
  if (days === 0) return "Expires today";
  return days === 1 ? "Expires tomorrow" : `Expires in ${days} days`;
}

/** "3 min ago" style age of a timestamp. */
export function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Whole days since `iso` (0 on the same day). */
export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY));
}
