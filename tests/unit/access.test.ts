import { describe, expect, it } from "vitest";
import { ACCESS_MODULES, FULL_ACCESS, NO_ACCESS, levelAtLeast, maxLevel, normalizePermissions } from "@/lib/access";

describe("access levels", () => {
  it("orders NONE < VIEW < MANAGE", () => {
    expect(levelAtLeast("MANAGE", "VIEW")).toBe(true);
    expect(levelAtLeast("VIEW", "MANAGE")).toBe(false);
    expect(levelAtLeast(undefined, "VIEW")).toBe(false);
    expect(maxLevel("VIEW", "NONE")).toBe("VIEW");
  });

  it("normalizes unknown, missing and unsupported levels", () => {
    const map = normalizePermissions({ bookings: "MANAGE", dashboard: "MANAGE", ledger: "ADMIN", junk: "MANAGE" });
    expect(map.bookings).toBe("MANAGE");
    expect(map.dashboard).toBe("VIEW"); // dashboard has no Manage level
    expect(map.ledger).toBe("NONE");
    expect(Object.keys(map).sort()).toEqual(ACCESS_MODULES.map(m => m.key).sort());
  });

  it("has full and empty grids", () => {
    expect(Object.values(NO_ACCESS).every(l => l === "NONE")).toBe(true);
    expect(FULL_ACCESS.bookings).toBe("MANAGE");
    expect(FULL_ACCESS.dashboard).toBe("VIEW");
  });
});
