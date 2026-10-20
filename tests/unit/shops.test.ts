import { beforeEach, describe, expect, it, vi } from "vitest";

type ShopRow = { id: string; name: string; isArchived: boolean; createdAt: Date; _count?: { transactions: number } };

const state = vi.hoisted(() => ({
  shops: [] as ShopRow[],
  settings: new Map<string, unknown>(),
  txCounts: new Map<string, number>(),
}));

const db = vi.hoisted(() => {
  const shop = {
    findUnique: vi.fn(async ({ where, include }: { where: { id: string }; include?: unknown }) => {
      const row = state.shops.find(s => s.id === where.id);
      if (!row) return null;
      return include ? { ...row, _count: { transactions: state.txCounts.get(row.id) ?? 0 } } : row;
    }),
    findFirst: vi.fn(async ({ where }: { where: { id?: { not: string }; isArchived?: boolean; name?: { equals: string } } }) => {
      return (
        state.shops
          .filter(s => (where.isArchived === undefined || s.isArchived === where.isArchived))
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
  const client = {
    shop,
    systemSetting,
    systemLog: { create: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return client;
});

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/authz", () => ({
  requireAdmin: vi.fn(async () => ({ user: { id: "admin", role: "ADMIN", email: null, name: null } })),
  requireUser: vi.fn(async () => ({ user: { id: "admin", role: "ADMIN", email: null, name: null } })),
}));

import { getDefaultShopId, resolveShopForWrite, shopWhere } from "@/lib/shops";
import { DELETE, PUT } from "@/app/api/shops/[id]/route";

const day = (n: number) => new Date(2026, 0, n);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const put = (id: string, body: unknown) =>
  PUT(new Request(`http://x/api/shops/${id}`, { method: "PUT", body: JSON.stringify(body) }), ctx(id));

beforeEach(() => {
  vi.clearAllMocks();
  state.shops = [
    { id: "main", name: "Main Shop", isArchived: false, createdAt: day(1) },
    { id: "frames", name: "Frames", isArchived: false, createdAt: day(2) },
  ];
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
    await expect(getDefaultShopId()).rejects.toThrow("No active shop exists");
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

  it("filters reads only when a shop is chosen", () => {
    expect(shopWhere(undefined)).toEqual({});
    expect(shopWhere("frames")).toEqual({ shopId: "frames" });
  });
});

describe("PUT /api/shops/[id]", () => {
  it("promotes another shop when the default is archived", async () => {
    const res = await put("main", { isArchived: true });
    expect(res.status).toBe(200);
    expect(state.settings.get("default_shop_id")).toBe("frames");
  });

  it("refuses to archive the last active shop", async () => {
    state.shops[1].isArchived = true;
    const res = await put("main", { isArchived: true });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/last active shop/);
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
    expect(state.shops.map(s => s.id)).toEqual(["main"]);
  });

  it("won't delete the last active shop", async () => {
    state.shops = [{ id: "solo", name: "Solo", isArchived: false, createdAt: day(1) }];
    state.settings.set("default_shop_id", "solo");
    const res = await DELETE(new Request("http://x"), ctx("solo"));
    expect(res.status).toBe(409);
  });
});
