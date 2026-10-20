import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, getServerSession, shopFind } = vi.hoisted(() => ({
  findMany: vi.fn(),
  getServerSession: vi.fn(),
  shopFind: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: { shopMember: { findMany }, shop: { findUnique: shopFind } } }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession }));

import { can, canWriteTransaction, clearAccessCache, getSessionUser, getUserAccess, requireAccess, requireOwner, verifyCronRequest } from "@/lib/authz";

const sessionFor = (role: string, status = "ACTIVE") => ({ user: { id: "u1", role, status, email: "a@b.c", name: "A" } });
const member = { id: "u1", role: "MEMBER" as const, email: null, name: null };
const owner = { id: "o1", role: "OWNER" as const, email: null, name: null };
const grid = (over: Record<string, string>) => ({ dashboard: "VIEW", bookings: "NONE", albums: "NONE", gifts: "NONE", analytics: "NONE", ledger: "NONE", inventory: "NONE", recycle_bin: "NONE", ...over });
const membership = (shopId: string, type: string, key: string, perms: Record<string, string>) => ({
  shop: { id: shopId, name: shopId, type },
  role: { key, name: key, permissions: grid(perms) },
});

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([]);
  getServerSession.mockReset();
  clearAccessCache();
  delete process.env.CRON_SECRET;
});

describe("owners", () => {
  it("can do everything without any lookups", async () => {
    expect(await can(owner, "inventory", "MANAGE", "any-shop")).toBe(true);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("per-shop roles", () => {
  beforeEach(() => {
    findMany.mockResolvedValue([
      membership("head", "STUDIO", "STAFF", { bookings: "MANAGE", ledger: "VIEW" }),
      membership("show", "STUDIO", "ADMIN", { bookings: "VIEW", ledger: "MANAGE", analytics: "VIEW" }),
      membership("manju", "FERTILIZER", "STAFF", { ledger: "VIEW", inventory: "MANAGE" }),
    ]);
  });

  it("uses the role in that shop for shop modules", async () => {
    expect(await can(member, "ledger", "MANAGE", "show")).toBe(true);
    expect(await can(member, "ledger", "MANAGE", "head")).toBe(false);
    expect(await can(member, "inventory", "MANAGE", "manju")).toBe(true);
    expect(await can(member, "ledger", "VIEW", "elsewhere")).toBe(false);
  });

  it("folds studio-wide modules to the highest studio role", async () => {
    const access = await getUserAccess(member);
    expect(access.studio.bookings).toBe("MANAGE");
    expect(access.studio.analytics).toBe("VIEW");
    expect(access.studio.inventory).toBe("NONE"); // fertilizer roles don't leak into the studio
    expect(await can(member, "bookings", "MANAGE", "manju")).toBe(true); // studio module ignores the shop
  });

  it("caches access briefly", async () => {
    await getUserAccess(member);
    await getUserAccess(member);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("allows booking-linked payments for booking managers", async () => {
    expect(await canWriteTransaction(member, { shopId: "head" })).toBe(false);
    expect(await canWriteTransaction(member, { shopId: "head", bookingId: "b1" })).toBe(true);
    expect(await canWriteTransaction(member, { shopId: "show" })).toBe(true);
  });
});

describe("guards", () => {
  it("rejects missing and inactive sessions", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await requireAccess("bookings", "VIEW")).error?.status).toBe(401);
    getServerSession.mockResolvedValue(sessionFor("OWNER", "INACTIVE"));
    expect(await getSessionUser()).toBeNull();
  });

  it("rejects old role names", async () => {
    getServerSession.mockResolvedValue(sessionFor("ADMIN"));
    expect(await getSessionUser()).toBeNull();
  });

  it("keeps owner areas to owners", async () => {
    getServerSession.mockResolvedValue(sessionFor("MEMBER"));
    expect((await requireOwner()).error?.status).toBe(403);
    getServerSession.mockResolvedValue(sessionFor("OWNER"));
    expect((await requireOwner()).error).toBeUndefined();
  });

  it("returns 403 without the module level", async () => {
    getServerSession.mockResolvedValue(sessionFor("MEMBER"));
    findMany.mockResolvedValue([membership("head", "STUDIO", "STAFF", { bookings: "VIEW" })]);
    expect((await requireAccess("bookings", "MANAGE")).error?.status).toBe(403);
    expect((await requireAccess("bookings", "VIEW")).error).toBeUndefined();
  });
});

describe("verifyCronRequest", () => {
  const request = (auth?: string) => new Request("http://x/api/cron", { headers: auth ? { authorization: auth } : {} });

  it("fails closed when CRON_SECRET is unset", () => {
    expect(verifyCronRequest(request("Bearer "))?.status).toBe(403);
    expect(verifyCronRequest(request("Bearer undefined"))?.status).toBe(403);
  });

  it("accepts only the exact bearer secret", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(verifyCronRequest(request("Bearer s3cret"))).toBeNull();
    expect(verifyCronRequest(request("Bearer wrong!"))?.status).toBe(403);
  });
});
