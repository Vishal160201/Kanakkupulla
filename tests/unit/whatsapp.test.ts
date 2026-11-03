import { describe, expect, it } from "vitest";
import { CABLE_TEMPLATES, messageDate, normalizePhone, planLabel, renderTemplate, waChatUrl, withoutMissing } from "@/lib/whatsapp";

describe("normalizePhone", () => {
  it("adds 91 to local numbers and strips formatting", () => {
    expect(normalizePhone("98765 43210")).toBe("919876543210");
    expect(normalizePhone("09876543210")).toBe("919876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210");
  });
  it("rejects unusable numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("planLabel", () => {
  it("turns TIC plan codes into readable names", () => {
    expect(planLabel("TIC_BRONZE_20MBPS_UL_299")).toBe("Bronze 20 Mbps Unlimited");
    expect(planLabel("TIC_GOLD_75MBPS_UL_499_12M")).toBe("Gold 75 Mbps Unlimited · 12 months");
    expect(planLabel("TIC_NEW_50Mbps_UL_499_6M+1M")).toBe("New 50 Mbps Unlimited · 6+1 months");
    expect(planLabel("TIC_SNKL_200Mbps_3000GB_1199")).toBe("SNKL 200 Mbps 3000 GB");
    expect(planLabel("TIC_ADP_30Mbps_UL_299")).toBe("ADP 30 Mbps Unlimited");
    expect(planLabel(null)).toBe("");
  });
});

describe("templates", () => {
  const vars = { customer: "Ganesan M", provider: "TIC Fiber", plan: "Bronze 20 Mbps Unlimited", expiry: "06 Nov 2026", due: "₹299", upi: "ravicable@upi", phone: "9876543210", shop: "Ravi Cable" };
  const fill = (v: Record<string, string>, lang: "en" | "ta" = "en") => renderTemplate(withoutMissing(CABLE_TEMPLATES[lang].renewalReminder, v), v);

  it("puts one detail per line", () => {
    expect(fill(vars)).toBe(
      "Hi Ganesan M,\n\nYour TIC Fiber internet plan expires on *06 Nov 2026*. Please renew to keep your connection running.\n\nPlan: Bronze 20 Mbps Unlimited\nAmount: *₹299*\nPay by UPI: ravicable@upi\nHelp: 9876543210\n\nThank you,\nRavi Cable"
    );
  });
  it("drops lines for missing values", () => {
    expect(fill({ ...vars, due: "", upi: "", phone: "" })).toBe(
      "Hi Ganesan M,\n\nYour TIC Fiber internet plan expires on *06 Nov 2026*. Please renew to keep your connection running.\n\nPlan: Bronze 20 Mbps Unlimited\n\nThank you,\nRavi Cable"
    );
  });
  it("has Tamil for every message, with the same placeholders", () => {
    for (const kind of Object.keys(CABLE_TEMPLATES.en) as (keyof typeof CABLE_TEMPLATES.en)[]) {
      const keys = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(keys(CABLE_TEMPLATES.ta[kind])).toEqual(keys(CABLE_TEMPLATES.en[kind]));
    }
    expect(fill({ ...vars, upi: "" }, "ta")).toContain("வணக்கம் Ganesan M,");
    expect(fill({ ...vars, upi: "" }, "ta")).not.toContain("UPI");
  });
  it("writes dates in the message language", () => {
    expect(messageDate("2026-11-06T18:29:00Z", "en")).toBe("06 Nov 2026");
    expect(messageDate("2026-11-06T18:29:00Z", "ta")).toMatch(/^06 .+ 2026$/);
  });
  it("keeps unknown placeholders visible", () => {
    expect(renderTemplate("Hi {nmae}", { name: "A" })).toBe("Hi {nmae}");
  });
  it("builds wa.me links", () => {
    expect(waChatUrl("919876543210", "Hi there")).toBe("https://wa.me/919876543210?text=Hi%20there");
  });
});
