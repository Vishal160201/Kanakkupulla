import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/** SystemSetting key holding the default shop's id (one row, so exactly one default exists). */
export const DEFAULT_SHOP_SETTING = "default_shop_id";

/** Fields of a shop that list responses embed in each transaction. */
export const shopSummarySelect = { id: true, name: true, color: true, icon: true } satisfies Prisma.ShopSelect;

type Db = Pick<typeof prisma, "shop" | "systemSetting">;

export class ShopError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Returns the default shop id, repairing the setting if it points at a missing or archived shop
 * (it then falls back to the oldest active shop).
 */
export async function getDefaultShopId(db: Db = prisma): Promise<string> {
  const setting = await db.systemSetting.findUnique({ where: { key: DEFAULT_SHOP_SETTING } });
  const storedId = typeof setting?.value === "string" ? setting.value : null;
  if (storedId) {
    const shop = await db.shop.findUnique({ where: { id: storedId }, select: { isArchived: true } });
    if (shop && !shop.isArchived) return storedId;
  }

  const fallback = await db.shop.findFirst({ where: { isArchived: false }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!fallback) throw new ShopError("No active shop exists. Create a shop in Settings first.", 409);
  await setDefaultShopId(fallback.id, db);
  return fallback.id;
}

export async function setDefaultShopId(shopId: string, db: Db = prisma) {
  await db.systemSetting.upsert({
    where: { key: DEFAULT_SHOP_SETTING },
    update: { value: shopId },
    create: { key: DEFAULT_SHOP_SETTING, value: shopId },
  });
}

/**
 * Shop for a new or edited ledger entry. An explicit shop must exist and be active; when none is
 * given (automatic booking / gift payments, older clients) the entry goes to the default shop.
 */
export async function resolveShopForWrite(shopId: string | null | undefined, db: Db = prisma): Promise<string> {
  if (!shopId) return getDefaultShopId(db);
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { isArchived: true } });
  if (!shop) throw new ShopError("Shop not found.", 422);
  if (shop.isArchived) throw new ShopError("This shop is archived. Pick an active shop.", 422);
  return shopId;
}

/** `where` fragment for read filters: no shop id means all shops. */
export function shopWhere(shopId: string | null | undefined): Prisma.TransactionWhereInput {
  return shopId ? { shopId } : {};
}

/** Case-insensitive name clash check (the DB unique index is case-sensitive). */
export async function shopNameTaken(name: string, exceptId?: string, db: Pick<typeof prisma, "shop"> = prisma) {
  const clash = await db.shop.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return !!clash;
}
