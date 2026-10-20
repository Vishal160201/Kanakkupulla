import { beforeEach, describe, expect, it, vi } from "vitest";

type ShopRow = { id: string; name: string; isArchived: boolean; createdAt: Date; type: "STUDIO" | "FERTILIZER" };

const state = vi.hoisted(() => ({
  shops: [] as ShopRow[],
  settings: new Map<string, unknown>(),
  txCounts: new Map<string, number>(),
  members: new Set<string>(), // `${shopId}:${userId}`
}));

const db = vi.hoisted(() => {
  const shop = {
    findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: unknown }) => {
      const row = state.shops.find(s => s.id === where.id);
      if (!row) return null;
      return include
        ? { ...row, _count: { transactions: state.txCounts.get(row.id) ?? 0, inventoryProducts: 0, inventoryBills: 0, inventoryCustomers: 0 } }
        : row;
    }),
    findFirst: vi.fn(async ({ where }: { where: { id?: { not: string }; isArchived?: boolean; type?: string; name?: { equals: string } } }) => {
      return (
        state.shops
          .filter(s => (where.isArchived === undefined || s.isArchived === where.isArchived))
          .filter(s => !where.type || s.type === where.type)
          .filter(s => !where.id || s.id !== where.id.not)
          .filter(s => !where.name || s.name.toLowerCase() === where.name.equals.toLowerCase())
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
      );
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<ShopRow> }) => {
      const row = state.shops.find(s => s.id === where.id)!;
      Object.assign(row, data);
      return row;
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      state.shops = state.shops.filter(s => s.id !== where.id);
    }),
  };
  const systemSetting = {
    findUnique: vi.fn(async ({ where }: { where: { key: string } }) =>
      state.settings.has(where.key) ? { key: where.key, value: state.settings.get(where.key) } : null),
    upsert: vi.fn(async ({ where, update }: { where: { key: string }; update: { value: unknown } }) => {
      state.settings.set(where.key, update.value);
    }),
  };
  const shopMember = {
    findUnique: vi.fn(async ({ where }: { where: { shopId_userId: { shopId: string; userId: string } } }) =>
      state.members.has(`${where.shopId_userId.shopId}:${where.shopId_userId.userId}`) ? { id: "m" } : null),
  };
  const client = {
    shop,
    shopMember,
    systemSetting,
    systemLog: { create: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return client;
});

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/authz", () => ({
  requireOwner: vi.fn(async () => ({ user: { id: "admin", role: "OWNER", email: null, name: null } })),
  requireUser: vi.fn(async () => ({ user: { id: "admin", role: "OWNER", email: null, name: null } })),
}));

import { canAccessShop, getDefaultShopId, resolveShopForWrite, shopWhere } from "@/lib/shops";
import { DELETE, PUT } from "@/app/api/shops/[id]/route";

const day = (n: number) => new Date(2026, 0, n);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const put = (id: string, body: unknown) =>
  PUT(new Request(`http://x/api/shops/${id}`, { method: "PUT", body: JSON.stringify(body) }), ctx(id));

beforeEach(() => {
  vi.clearAllMocks();
  state.shops = [
    { id: "main", name: "Main Shop", isArchived: false, createdAt: day(1), type: "STUDIO" },
    { id: "frames", name: "Frames", isArchived: false, createdAt: day(2), type: "STUDIO" },
    { id: "manju", name: "Manju agency", isArchived: false, createdAt: day(3), type: "FERTILIZER" },
  ];
  state.members = new Set();
  state.settings = new Map([["default_shop_id", "main"]]);
  state.txCounts = new Map([["main", 1133]]);
});

describe("default shop", () => {
  it("reads the setting", async () => {
    expect(await getDefaultShopId()).toBe("main");
  });

  it("repairs a setting that points at an archived shop", async () => {
    state.shops[0].isArchived = true;
    expect(await getDefaultShopId()).toBe("frames");
    expect(state.settings.get("default_shop_id")).toBe("frames");
  });

  it("errors clearly when no active shop exists", async () => {
    state.shops.forEach(s => (s.isArchived = true));
    await expect(getDefaultShopId()).rejects.toThrow("No active studio shop exists");
  });

  it("never picks a fertilizer shop as the default", async () => {
    state.settings.set("default_shop_id", "manju");
    state.shops[0].isArchived = true;
    expect(await getDefaultShopId()).toBe("frames");
  });
});

describe("resolveShopForWrite", () => {
  it("uses the default shop when none is given (automatic entries)", async () => {
    expect(await resolveShopForWrite(undefined)).toBe("main");
  });

  it("rejects missing and archived shops", async () => {
    await expect(resolveShopForWrite("nope")).rejects.toMatchObject({ status: 422 });
    state.shops[1].isArchived = true;
    await expect(resolveShopForWrite("frames")).rejects.toThrow("archived");
  });

  it("All Shops reads cover studio shops only", () => {
    expect(shopWhere(undefined)).toEqual({ shop: { type: "STUDIO" } });
    expect(shopWhere("frames")).toEqual({ shopId: "frames" });
  });

  it("gives members only their assigned shops; owners every shop", async () => {
    const staff = { id: "u1", role: "MEMBER" as const };
    const manju = { id: "manju", type: "FERTILIZER" as const };
    expect(await canAccessShop(staff, { id: "main", type: "STUDIO" })).toBe(false);
    expect(await canAccessShop(staff, manju)).toBe(false);
    expect(await canAccessShop({ id: "a1", role: "OWNER" }, manju)).toBe(true);
    state.members.add("manju:u1");
    state.members.add("main:u1");
    expect(await canAccessShop(staff, manju)).toBe(true);
    expect(await canAccessShop(staff, { id: "main", type: "STUDIO" })).toBe(true);
    await expect(resolveShopForWrite("manju", undefined, { id: "u2", role: "MEMBER" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("PUT /api/shops/[id]", () => {
  it("promotes another shop when the default is archived", async () => {
    const res = await put("main", { isArchived: true });
    expect(res.status).toBe(200);
    expect(state.settings.get("default_shop_id")).toBe("frames");
  });

  it("refuses to archive the last active studio shop", async () => {
    state.shops[1].isArchived = true;
    const res = await put("main", { isArchived: true });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/last active studio shop/);
  });

  it("lets the fertilizer shop be archived without touching the default", async () => {
    const res = await put("manju", { isArchived: true });
    expect(res.status).toBe(200);
    expect(state.settings.get("default_shop_id")).toBe("main");
  });

  it("won't make a fertilizer shop the default", async () => {
    const res = await put("manju", { isDefault: true });
    expect(res.status).toBe(422);
  });

  it("makes a shop the default", async () => {
    const res = await put("frames", { isDefault: true });
    expect((await res.json()).shop.isDefault).toBe(true);
    expect(state.settings.get("default_shop_id")).toBe("frames");
  });

  it("rejects duplicate names case-insensitively", async () => {
    const res = await put("frames", { name: "main shop" });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/shops/[id]", () => {
  it("blocks deleting a shop that has entries", async () => {
    const res = await DELETE(new Request("http://x"), ctx("main"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Archive it instead/);
  });

  it("deletes an empty shop", async () => {
    const res = await DELETE(new Request("http://x"), ctx("frames"));
    expect(res.status).toBe(200);
    expect(state.shops.map(s => s.id)).toEqual(["main", "manju"]);
  });

  it("won't delete the last active studio shop", async () => {
    state.shops = [{ id: "solo", name: "Solo", isArchived: false, createdAt: day(1), type: "STUDIO" }];
    state.settings.set("default_shop_id", "solo");
    const res = await DELETE(new Request("http://x"), ctx("solo"));
    expect(res.status).toBe(409);
  });
});
