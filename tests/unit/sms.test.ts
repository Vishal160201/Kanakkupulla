import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { needsReminder, reminderMessage, type ReminderSubscriber } from "@/lib/sms";

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
