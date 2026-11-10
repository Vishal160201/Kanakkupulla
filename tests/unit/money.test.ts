import { afterEach, describe, expect, it, vi } from "vitest";
import { formatINR, formatMoneyDate, maskLast4, normaliseMoney } from "@/lib/money/format";
import { canUseMoneyTracker, moneyTrackerEmail } from "@/lib/money/access";
import { moneyAccountSchema } from "@/lib/validations/money";

describe("normaliseMoney", () => {
  it("turns typed amounts into two-decimal strings", () => {
    expect(normaliseMoney("1000")).toBe("1000.00");
    expect(normaliseMoney("1,23,456.7")).toBe("123456.70");
    expect(normaliseMoney(" ₹3,333.33 ")).toBe("3333.33");
    expect(normaliseMoney("0003333.34")).toBe("3333.34");
    expect(normaliseMoney(12345)).toBe("12345.00");
    expect(normaliseMoney("-5500")).toBe("-5500.00");
    expect(normaliseMoney("-0")).toBe("0.00");
  });

  it("rejects anything that isn't a plain amount", () => {
    for (const bad of ["", "abc", "12.345", "1.2.3", "1e5", "12.", "--5", null, undefined]) {
      expect(normaliseMoney(bad)).toBeNull();
    }
  });

  it("keeps paise exact where floats would drift", () => {
    expect(normaliseMoney("0.1")).toBe("0.10");
    expect(normaliseMoney("999999999999.99")).toBe("999999999999.99");
  });
});

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR("123456.78")).toBe("₹1,23,456.78");
    expect(formatINR("12345678.9")).toBe("₹1,23,45,678.90");
    expect(formatINR("999")).toBe("₹999.00");
    expect(formatINR("1000")).toBe("₹1,000.00");
  });

  it("shows negatives with a minus sign before the rupee", () => {
    expect(formatINR("-5500")).toBe("−₹5,500.00");
    expect(formatINR("-8833.33")).toBe("−₹8,833.33");
  });

  it("can leave the symbol out", () => {
    expect(formatINR("25000", { symbol: false })).toBe("25,000.00");
  });
});

describe("display helpers", () => {
  it("masks to the last 4 digits", () => {
    expect(maskLast4("4321")).toBe("•••• 4321");
    expect(maskLast4(null)).toBe("");
  });

  it("formats calendar dates without a time-zone shift", () => {
    expect(formatMoneyDate("2026-11-13")).toBe("13 Nov 2026");
    expect(formatMoneyDate(new Date(Date.UTC(2026, 0, 1)))).toBe("01 Jan 2026");
    expect(formatMoneyDate(null)).toBe("");
  });
});

describe("money tracker access", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows only the configured email, ignoring case and spaces", () => {
    vi.stubEnv("MONEY_TRACKER_EMAIL", " Me@Example.com ");
    expect(moneyTrackerEmail()).toBe("me@example.com");
    expect(canUseMoneyTracker("me@example.com")).toBe(true);
    expect(canUseMoneyTracker("ME@EXAMPLE.COM")).toBe(true);
    expect(canUseMoneyTracker("someone@example.com")).toBe(false);
    expect(canUseMoneyTracker(null)).toBe(false);
  });

  it("is closed to everyone when no email is configured", () => {
    vi.stubEnv("MONEY_TRACKER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_PERSONAL_TRACKER_EMAIL", "");
    expect(canUseMoneyTracker("")).toBe(false);
    expect(canUseMoneyTracker("anyone@example.com")).toBe(false);
  });

  it("falls back to the older personal-tracker variable", () => {
    vi.stubEnv("MONEY_TRACKER_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_PERSONAL_TRACKER_EMAIL", "old@example.com");
    expect(canUseMoneyTracker("old@example.com")).toBe(true);
  });
});

describe("moneyAccountSchema", () => {
  const bank = { name: "KVB savings", institution: "Karur Vysya Bank", type: "BANK", ownIdentifiers: [], isPool: true };

  it("accepts a bank account and fills defaults", () => {
    const r = moneyAccountSchema.safeParse({ ...bank, last4: "1234", ownIdentifiers: ["kvbl0001234", "KVBL0001234", "name@okkvb"] });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.lowBalanceAlert).toBe("1000.00");
    expect(r.data.ownIdentifiers).toEqual(["KVBL0001234", "NAME@OKKVB"]);
    expect(r.data.isPool).toBe(true);
    expect(r.data.color).toBe("#f97316");
  });

  it("drops card-only fields from a bank account", () => {
    const r = moneyAccountSchema.safeParse({ ...bank, dueDay: 13, cycleStartDay: 20, creditLimit: "50000" });
    expect(r.success && r.data).toMatchObject({ dueDay: null, cycleStartDay: null, creditLimit: null });
  });

  it("never counts a credit card as available money", () => {
    const r = moneyAccountSchema.safeParse({ ...bank, name: "HDFC CC", type: "CREDIT_CARD", dueDay: 13, creditLimit: "1,00,000" });
    expect(r.success && r.data).toMatchObject({ isPool: false, dueDay: 13, creditLimit: "100000.00" });
  });

  it("rejects full account numbers, bad days and bad amounts", () => {
    expect(moneyAccountSchema.safeParse({ ...bank, last4: "12345678" }).success).toBe(false);
    expect(moneyAccountSchema.safeParse({ ...bank, last4: "12ab" }).success).toBe(false);
    expect(moneyAccountSchema.safeParse({ ...bank, type: "CREDIT_CARD", dueDay: 32 }).success).toBe(false);
    expect(moneyAccountSchema.safeParse({ ...bank, type: "CREDIT_CARD", dueDay: 0 }).success).toBe(false);
    expect(moneyAccountSchema.safeParse({ ...bank, lowBalanceAlert: "-5" }).success).toBe(false);
    expect(moneyAccountSchema.safeParse({ ...bank, lowBalanceAlert: "ten" }).success).toBe(false);
    expect(moneyAccountSchema.safeParse({ ...bank, name: "  " }).success).toBe(false);
    expect(moneyAccountSchema.safeParse({ ...bank, type: "WALLET" }).success).toBe(false);
  });
});

describe("card used amount", () => {
  it("is kept on cards and dropped from bank accounts", async () => {
    const card = moneyAccountSchema.safeParse({ name: "Main CC", institution: "HDFC Bank", type: "CREDIT_CARD", outstanding: "5,000.27" });
    expect(card.success && card.data.outstanding).toBe("5000.27");
    const bank = moneyAccountSchema.safeParse({ name: "HDFC savings", institution: "HDFC Bank", type: "BANK", outstanding: "500" });
    expect(bank.success && bank.data.outstanding).toBeNull();
    expect(moneyAccountSchema.safeParse({ name: "x", institution: "y", type: "CREDIT_CARD", outstanding: "-1" }).success).toBe(false);
  });

  it("dates the amount today in India, and keeps the date while it doesn't change", async () => {
    const { outstandingAsOf, todayInIndia } = await import("@/lib/money/accounts");
    // 20:00 UTC on 10 Nov is already 11 Nov in India
    const lateUtc = new Date("2026-11-10T20:00:00Z");
    expect(todayInIndia(lateUtc).toISOString().slice(0, 10)).toBe("2026-11-11");
    const earlier = new Date("2026-11-01T00:00:00Z");
    expect(outstandingAsOf("30000.22", { outstanding: "30000.22", outstandingAsOf: earlier }, lateUtc)).toBe(earlier);
    expect(outstandingAsOf("29000.00", { outstanding: "30000.22", outstandingAsOf: earlier }, lateUtc)?.toISOString().slice(0, 10)).toBe("2026-11-11");
    expect(outstandingAsOf(null, { outstanding: "30000.22", outstandingAsOf: earlier }, lateUtc)).toBeNull();
    expect(outstandingAsOf("5000.27", undefined, lateUtc)?.toISOString().slice(0, 10)).toBe("2026-11-11");
  });
});
