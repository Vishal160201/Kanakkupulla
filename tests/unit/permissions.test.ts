import { describe, expect, it } from "vitest";
import { DEFAULT_MATRIX, PERMISSIONS, ROLES, isPermission, isRole } from "@/lib/permissions";

describe("permission matrix", () => {
  it("defines every permission for every role", () => {
    for (const role of ROLES) {
      expect(Object.keys(DEFAULT_MATRIX[role]).sort()).toEqual([...PERMISSIONS].sort());
    }
  });

  it("grants ADMIN everything", () => {
    expect(Object.values(DEFAULT_MATRIX.ADMIN).every(Boolean)).toBe(true);
  });

  it("keeps money management away from STAFF and PHOTOGRAPHER by default", () => {
    expect(DEFAULT_MATRIX.STAFF.manage_transactions).toBe(false);
    expect(DEFAULT_MATRIX.PHOTOGRAPHER.view_transactions).toBe(false);
    expect(DEFAULT_MATRIX.PHOTOGRAPHER.manage_bookings).toBe(false);
  });

  it("validates role and permission names", () => {
    expect(isRole("STAFF")).toBe(true);
    expect(isRole("SUPER_ADMIN")).toBe(false);
    expect(isPermission("manage_bookings")).toBe(true);
    expect(isPermission("notify_BOOKING_CREATED")).toBe(false);
    expect(isPermission(undefined)).toBe(false);
  });
});
