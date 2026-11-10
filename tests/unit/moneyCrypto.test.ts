import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptOptional, decryptText, encryptOptional, encryptText, isMoneyEncryptionConfigured, lookupHash } from "@/lib/money/crypto";

const KEY_A = Buffer.alloc(32, 7).toString("base64");
const KEY_B = Buffer.alloc(32, 9).toString("base64");

describe("money field encryption", () => {
  beforeEach(() => vi.stubEnv("MONEY_ENCRYPTION_KEY", KEY_A));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips text, including Tamil and symbols", () => {
    for (const text of ["UPI-ARUN-arun@okaxis-REF 123456789012", "தமிழ் ₹3,333.33", ""]) {
      const stored = encryptText(text);
      expect(stored.startsWith("v1:")).toBe(true);
      expect(stored).not.toContain("ARUN");
      expect(decryptText(stored)).toBe(text);
    }
  });

  it("uses a fresh IV, so equal text doesn't look equal", () => {
    expect(encryptText("SWIGGY")).not.toBe(encryptText("SWIGGY"));
  });

  it("rejects tampered ciphertext and the wrong key", () => {
    const stored = encryptText("KVB transfer");
    const parts = stored.split(":");
    const flipped = Buffer.from(parts[3], "base64");
    flipped[0] ^= 1;
    expect(() => decryptText([...parts.slice(0, 3), flipped.toString("base64")].join(":"))).toThrow();
    vi.stubEnv("MONEY_ENCRYPTION_KEY", KEY_B);
    expect(() => decryptText(stored)).toThrow();
  });

  it("passes through values that were never encrypted, and nulls", () => {
    expect(decryptText("plain old text")).toBe("plain old text");
    expect(encryptOptional(null)).toBeNull();
    expect(encryptOptional("")).toBeNull();
    expect(decryptOptional(null)).toBeNull();
  });

  it("hashes lookups stably per key", () => {
    expect(lookupHash("2026-11-01|123456789012|4700.00")).toBe(lookupHash("2026-11-01|123456789012|4700.00"));
    expect(lookupHash("a")).not.toBe(lookupHash("b"));
    const a = lookupHash("x");
    vi.stubEnv("MONEY_ENCRYPTION_KEY", KEY_B);
    expect(lookupHash("x")).not.toBe(a);
  });

  it("refuses a missing or wrong-length key", () => {
    vi.stubEnv("MONEY_ENCRYPTION_KEY", "");
    expect(isMoneyEncryptionConfigured()).toBe(false);
    expect(() => encryptText("x")).toThrow(/not set/);
    vi.stubEnv("MONEY_ENCRYPTION_KEY", Buffer.alloc(16).toString("base64"));
    expect(() => encryptText("x")).toThrow(/32 bytes/);
  });
});
