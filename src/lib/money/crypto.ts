import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "crypto";

/**
 * Field encryption for the money tracker. Bank text (narrations, counterparties, UPI IDs,
 * notes, rule patterns, commitment names) is stored as AES-256-GCM ciphertext so a database
 * leak shows nothing readable. Amounts and dates stay plain so totals still run in SQL.
 *
 * MONEY_ENCRYPTION_KEY: 32 random bytes, base64 (`openssl rand -base64 32`). Kept only in the
 * environment (Vercel + local .env). Losing it makes the encrypted text unreadable.
 *
 * Stored format: "v1:<iv b64>:<tag b64>:<ciphertext b64>".
 */

const PREFIX = "v1:";

let cachedKeys: { enc: Buffer; mac: Buffer } | null = null;
let cachedFrom: string | undefined;

function keys() {
  const raw = process.env.MONEY_ENCRYPTION_KEY;
  if (cachedKeys && cachedFrom === raw) return cachedKeys;
  if (!raw) throw new MoneyCryptoError("MONEY_ENCRYPTION_KEY is not set, so the money tracker can't read or save bank text.");
  const master = Buffer.from(raw, "base64");
  if (master.length !== 32) throw new MoneyCryptoError("MONEY_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).");
  // Separate keys for encryption and for dedupe/lookup hashes
  cachedKeys = {
    enc: Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), "kanakku-money-enc", 32)),
    mac: Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), "kanakku-money-mac", 32)),
  };
  cachedFrom = raw;
  return cachedKeys;
}

export class MoneyCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyCryptoError";
  }
}

export function isMoneyEncryptionConfigured(): boolean {
  try {
    keys();
    return true;
  } catch {
    return false;
  }
}

export function encryptText(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys().enc, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${body.toString("base64")}`;
}

export function decryptText(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // never encrypted (e.g. a value saved before encryption)
  const [iv, tag, body] = stored.slice(PREFIX.length).split(":");
  if (!iv || !tag || body === undefined) throw new MoneyCryptoError("Encrypted value is damaged.");
  const decipher = createDecipheriv("aes-256-gcm", keys().enc, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}

export function encryptOptional(plain: string | null | undefined): string | null {
  return plain == null || plain === "" ? null : encryptText(plain);
}

export function decryptOptional(stored: string | null | undefined): string | null {
  return stored == null ? null : decryptText(stored);
}

/** Keyed hash (hex) for dedupe keys: equal inputs match, but the key reveals nothing. */
export function lookupHash(value: string): string {
  return createHmac("sha256", keys().mac).update(value).digest("hex");
}
