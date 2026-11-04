import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import prisma from "@/lib/prisma";
import { isDeviceConnected, needsReminder, reminderMessage, shopForDevice, type ReminderSubscriber } from "@/lib/sms";

const shop = { name: "Nila Cable", upiId: "nila@upi", contactPhone: "9876543210" };
const base: ReminderSubscriber = { name: "Kumar", provider: "TIC_FIBER", plan: "TIC_GOLD_75MBPS_UL_499", vcNumber: null, expiresAt: null, phone: "9000000001", due: 0 };

describe("reminderMessage", () => {
  it("internet, owing → payment pending with the amount", () => {
    const t = reminderMessage({ ...base, due: 499 }, shop, "en");
    expect(t).toContain("₹499");
    expect(t).toContain("pending");
    expect(t).not.toContain("*"); // SMS has no bold
  });

  it("internet, expired → renew-today message", () => {
    const t = reminderMessage({ ...base, expiresAt: "2020-01-01T00:00:00Z", due: 499 }, shop, "en");
    expect(t).toContain("expired");
  });

  it("internet, active and paid → upcoming renewal reminder", () => {
    const t = reminderMessage({ ...base, expiresAt: "2099-01-01T00:00:00Z", due: 0 }, shop, "en");
    expect(t).toContain("expires on");
  });

  it("cable with dues → includes the VC number; no dues → nothing to send", () => {
    const t = reminderMessage({ ...base, provider: "TCCL", plan: null, vcNumber: "0123456789", due: 300 }, shop, "en");
    expect(t).toContain("0123456789");
    expect(reminderMessage({ ...base, provider: "TCCL", due: 0 }, shop, "en")).toBeNull();
  });

  it("Tamil renders", () => {
    expect(reminderMessage({ ...base, due: 499 }, shop, "ta")).toContain("வணக்கம் Kumar");
  });
});

describe("needsReminder", () => {
  const now = new Date("2026-11-03T00:00:00Z").getTime();
  it("internet: owing, expiring soon or expired", () => {
    expect(needsReminder({ ...base, due: 100 }, now)).toBe(true);
    expect(needsReminder({ ...base, expiresAt: "2026-11-06T00:00:00Z" }, now)).toBe(true); // within 7 days
    expect(needsReminder({ ...base, expiresAt: "2026-12-30T00:00:00Z" }, now)).toBe(false);
    expect(needsReminder({ ...base }, now)).toBe(false); // no expiry, no due
  });
  it("cable: only when owing", () => {
    expect(needsReminder({ ...base, provider: "TCCL", due: 50 }, now)).toBe(true);
    expect(needsReminder({ ...base, provider: "TCCL", due: 0 }, now)).toBe(false);
  });
});

describe("shopForDevice (one phone per token)", () => {
  const db = prisma as unknown as { shop: Record<string, unknown> };
  const shopRow = (smsDeviceId: string | null) => ({ id: "s1", type: "CABLE", isArchived: false, smsDeviceId });

  it("rejects an unknown token", async () => {
    db.shop = { findUnique: vi.fn().mockResolvedValue(null) };
    expect(await shopForDevice("kst_x", "phone-a")).toEqual({ error: "token" });
  });

  it("binds the first phone, then lets it back in", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    db.shop = { findUnique: vi.fn().mockResolvedValue(shopRow(null)), updateMany };
    expect(await shopForDevice("kst_x", "phone-a")).toHaveProperty("shop");
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "s1", smsDeviceId: null }, data: { smsDeviceId: "phone-a" } });
    db.shop = { findUnique: vi.fn().mockResolvedValue(shopRow("phone-a")) };
    expect(await shopForDevice("kst_x", "phone-a")).toHaveProperty("shop");
  });

  it("refuses a second phone and a missing device id", async () => {
    db.shop = { findUnique: vi.fn().mockResolvedValue(shopRow("phone-a")) };
    expect(await shopForDevice("kst_x", "phone-b")).toEqual({ error: "device" });
    expect(await shopForDevice("kst_x", null)).toEqual({ error: "device" });
  });

  it("loses the bind race to another phone → refused", async () => {
    db.shop = {
      findUnique: vi.fn().mockResolvedValueOnce(shopRow(null)).mockResolvedValueOnce({ smsDeviceId: "phone-a" }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    expect(await shopForDevice("kst_x", "phone-b")).toEqual({ error: "device" });
  });
});

describe("isDeviceConnected", () => {
  const now = Date.parse("2026-11-04T11:00:00Z");
  it("connected only when the phone polled in the last 2 minutes", () => {
    expect(isDeviceConnected(new Date(now - 30_000), now)).toBe(true);
    expect(isDeviceConnected(new Date(now - 3 * 60_000), now)).toBe(false);
    expect(isDeviceConnected(null, now)).toBe(false);
  });
});
