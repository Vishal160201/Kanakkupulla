import { createHmac, timingSafeEqual } from "crypto";

const DAY_MS = 24 * 60 * 60 * 1000;
export const INVOICE_LINK_DAYS = 30;

/** A key just for invoice links, derived from the app secret (so the raw secret signs nothing else here). */
function key(secret = process.env.NEXTAUTH_SECRET): Buffer {
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return createHmac("sha256", secret).update("invoice-share-link").digest();
}

const sign = (payload: string, secret?: string) => createHmac("sha256", key(secret)).update(payload).digest("base64url").slice(0, 22);

/**
 * Token for a client-facing invoice link: `<invoiceId>.<expiry>.<signature>`. Anyone holding it can open that one
 * invoice until it expires, without signing in.
 * shortcut: links can't be revoked before expiry; add a per-invoice nonce on the Invoice row if that's ever needed.
 */
export function createInvoiceToken(invoiceId: string, { now = Date.now(), days = INVOICE_LINK_DAYS, secret }: { now?: number; days?: number; secret?: string } = {}) {
  const expires = Math.floor((now + days * DAY_MS) / 1000).toString(36);
  const payload = `${invoiceId}.${expires}`;
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt: new Date(parseInt(expires, 36) * 1000) };
}

/** The invoice id when the token is genuine and not expired, else null. */
export function readInvoiceToken(token: string, { now = Date.now(), secret }: { now?: number; secret?: string } = {}): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [invoiceId, expires, signature] = parts;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(invoiceId) || !/^[a-z0-9]{1,10}$/.test(expires)) return null;
  const expected = Buffer.from(sign(`${invoiceId}.${expires}`, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (parseInt(expires, 36) * 1000 < now) return null;
  return invoiceId;
}
