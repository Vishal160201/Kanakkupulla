import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDay } from "@/lib/demo/seed";
import { canUseMoneyTracker } from "@/lib/money/access";
import { isDemo, isDemoServer } from "@/lib/demo/mode";

vi.mock("@/lib/prisma", () => ({ default: {} }));

afterEach(() => vi.unstubAllEnvs());

describe("demo mode switch", () => {
  it("is off unless the flags are set", () => {
    vi.stubEnv("DEMO_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(isDemo()).toBe(false);
    expect(isDemoServer()).toBe(false);
  });

  it("the browser flag alone never turns on the server side", () => {
    vi.stubEnv("DEMO_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "1");
    expect(isDemo()).toBe(true);
    expect(isDemoServer()).toBe(false);
  });

  it("keeps the money tracker closed on the demo, even for its configured account", () => {
    vi.stubEnv("MONEY_TRACKER_EMAIL", "me@example.com");
    vi.stubEnv("DEMO_MODE", "");
    expect(canUseMoneyTracker("me@example.com")).toBe(true);
    vi.stubEnv("DEMO_MODE", "1");
    expect(canUseMoneyTracker("me@example.com")).toBe(false);
  });
});

describe("demo dates", () => {
  it("counts days in India, not UTC", () => {
    // 20:00 UTC on 14 Nov is already 15 Nov in India
    const now = new Date("2026-11-14T20:00:00.000Z");
    expect(demoDay(0, now)).toBe("2026-11-15");
    expect(demoDay(-1, now)).toBe("2026-11-14");
    expect(demoDay(17, now)).toBe("2026-12-02");
  });
});
