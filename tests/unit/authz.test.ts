import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, getServerSession } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: { rolePermission: { findUnique } } }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession }));

import {
  canWriteTransaction,
  getSessionUser,
  requireAdmin,
  requirePermission,
  roleHasPermission,
  verifyCronRequest,
} from "@/lib/authz";

const sessionFor = (role: string, status = "ACTIVE") => ({
  user: { id: "u1", role, status, email: "a@b.c", name: "A" },
});

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue(null);
  getServerSession.mockReset();
  delete process.env.CRON_SECRET;
});

describe("roleHasPermission", () => {
  it("always allows ADMIN without a DB lookup", async () => {
    expect(await roleHasPermission("ADMIN", "manage_users")).toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("falls back to the default matrix", async () => {
    expect(await roleHasPermission("STAFF", "manage_bookings")).toBe(true);
    expect(await roleHasPermission("STAFF", "manage_transactions")).toBe(false);
  });

  it("prefers a DB override", async () => {
    findUnique.mockResolvedValue({ enabled: true });
    expect(await roleHasPermission("STAFF", "manage_transactions")).toBe(true);
    findUnique.mockResolvedValue({ enabled: false });
    expect(await roleHasPermission("STAFF", "manage_bookings")).toBe(false);
  });
});

describe("session guards", () => {
  it("rejects missing sessions with 401", async () => {
    getServerSession.mockResolvedValue(null);
    const result = await requirePermission("manage_bookings");
    expect(result.error?.status).toBe(401);
  });

  it("treats INACTIVE users as signed out", async () => {
    getServerSession.mockResolvedValue(sessionFor("ADMIN", "INACTIVE"));
    expect(await getSessionUser()).toBeNull();
  });

  it("rejects unknown roles", async () => {
    getServerSession.mockResolvedValue(sessionFor("SUPER_ADMIN"));
    expect(await getSessionUser()).toBeNull();
  });

  it("returns 403 when the permission is missing", async () => {
    getServerSession.mockResolvedValue(sessionFor("PHOTOGRAPHER"));
    expect((await requirePermission("manage_transactions")).error?.status).toBe(403);
    expect((await requireAdmin()).error?.status).toBe(403);
  });

  it("passes when any listed permission is held", async () => {
    getServerSession.mockResolvedValue(sessionFor("PHOTOGRAPHER"));
    const result = await requirePermission("manage_bookings", "manage_galleries");
    expect(result.error).toBeUndefined();
    expect(result.user?.id).toBe("u1");
  });
});

describe("canWriteTransaction", () => {
  const staff = { id: "u1", role: "STAFF" as const, email: null, name: null };

  it("lets booking managers write linked transactions only", async () => {
    expect(await canWriteTransaction(staff, { bookingId: "b1" })).toBe(true);
    expect(await canWriteTransaction(staff, { productOrderId: "p1" })).toBe(true);
    expect(await canWriteTransaction(staff, {})).toBe(false);
  });

  it("lets transaction managers write anything", async () => {
    findUnique.mockResolvedValue({ enabled: true });
    expect(await canWriteTransaction(staff, {})).toBe(true);
  });
});

describe("verifyCronRequest", () => {
  const request = (auth?: string) =>
    new Request("http://x/api/cron", { headers: auth ? { authorization: auth } : {} });

  it("fails closed when CRON_SECRET is unset", () => {
    expect(verifyCronRequest(request("Bearer "))?.status).toBe(403);
    expect(verifyCronRequest(request("Bearer undefined"))?.status).toBe(403);
  });

  it("accepts only the exact bearer secret", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(verifyCronRequest(request("Bearer s3cret"))).toBeNull();
    expect(verifyCronRequest(request("Bearer wrong!"))?.status).toBe(403);
    expect(verifyCronRequest(request())?.status).toBe(403);
  });
});
