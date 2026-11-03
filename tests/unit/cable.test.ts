import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {}, toNumber: (v: unknown) => Number(v ?? 0) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { lastMonths, toMonth } from "@/lib/cable";

describe("report months", () => {
  it("buckets by India time", () => {
    // 31 Oct 2026 19:00 UTC is already 1 Nov in India
    expect(toMonth(new Date("2026-10-31T19:00:00Z"))).toBe("2026-11");
    expect(toMonth(new Date("2026-10-31T18:00:00Z"))).toBe("2026-10");
  });

  it("lists the last months oldest first, across a year end", () => {
    expect(lastMonths(4, new Date("2027-02-10T06:00:00Z"))).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
});
