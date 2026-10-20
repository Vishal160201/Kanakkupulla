import type { Prisma, ShopType } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/authz";

/** SystemSetting key holding the default shop's id (one row, so exactly one default exists). */
export const DEFAULT_SHOP_SETTING = "default_shop_id";

/** Fields of a shop that list responses embed in each transaction. */
export const shopSummarySelect = { id: true, name: true, color: true, icon: true } satisfies Prisma.ShopSelect;

type Db = Pick<typeof prisma, "shop" | "systemSetting" | "shopMember">;

export class ShopError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Returns the default shop id, repairing the setting if it points at a missing, archived or
 * non-studio shop (it then falls back to the oldest active studio shop). Booking and gift
 * payments land here, so it is always a studio shop.
 */
export async function getDefaultShopId(db: Db = prisma): Promise<string> {
  const setting = await db.systemSetting.findUnique({ where: { key: DEFAULT_SHOP_SETTING } });
  const storedId = typeof setting?.value === "string" ? setting.value : null;
  if (storedId) {
    const shop = await db.shop.findUnique({ where: { id: storedId }, select: { isArchived: true, type: true } });
    if (shop && !shop.isArchived && shop.type === "STUDIO") return storedId;
  }

  const fallback = await db.shop.findFirst({
    where: { isArchived: false, type: "STUDIO" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!fallback) throw new ShopError("No active studio shop exists. Create a shop in Settings first.", 409);
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

/** Whether a user may open a shop: owners every shop, members the shops they're assigned to. */
export async function canAccessShop(
  user: Pick<SessionUser, "id" | "role">,
  shop: { id: string; type?: ShopType },
  db: Pick<typeof prisma, "shopMember"> = prisma
): Promise<boolean> {
  if (user.role === "OWNER") return true;
  const member = await db.shopMember.findUnique({
    where: { shopId_userId: { shopId: shop.id, userId: user.id } },
    select: { id: true },
  });
  return !!member;
}

/** `where` for the shops a user can see in lists. */
export function accessibleShopsWhere(user: Pick<SessionUser, "id" | "role">): Prisma.ShopWhereInput {
  if (user.role === "OWNER") return {};
  return { members: { some: { userId: user.id } } };
}

/** Loads a shop the user may open; 404 when missing, 403 when not allowed. */
export async function getAccessibleShop(user: Pick<SessionUser, "id" | "role">, shopId: string, db: Db = prisma) {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new ShopError("Shop not found.", 404);
  if (!(await canAccessShop(user, shop, db))) throw new ShopError("You don't have access to this shop.", 403);
  return shop;
}

/**
 * Shop for a new or edited ledger entry. An explicit shop must exist, be active and (when a user
 * is given) be accessible; when none is given (automatic booking / gift payments, older clients)
 * the entry goes to the default studio shop.
 */
export async function resolveShopForWrite(
  shopId: string | null | undefined,
  db: Db = prisma,
  user?: Pick<SessionUser, "id" | "role">
): Promise<string> {
  if (!shopId) return getDefaultShopId(db);
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { id: true, isArchived: true, type: true } });
  if (!shop) throw new ShopError("Shop not found.", 422);
  if (shop.isArchived) throw new ShopError("This shop is archived. Pick an active shop.", 422);
  if (user && !(await canAccessShop(user, shop, db))) throw new ShopError("You don't have access to this shop.", 403);
  return shopId;
}

/**
 * Checks a `?shopId=` read filter: the shop must be accessible and (optionally) of an allowed
 * type. No shop id is fine — reads then cover the studio shops (see shopWhere).
 */
export async function assertReadableShop(
  user: Pick<SessionUser, "id" | "role">,
  shopId: string | null | undefined,
  allowedTypes?: ShopType[]
) {
  if (!shopId) return;
  const shop = await getAccessibleShop(user, shopId);
  if (allowedTypes && !allowedTypes.includes(shop.type)) {
    throw new ShopError("This view isn't available for this shop.", 422);
  }
}

/** `where` fragment for read filters: no shop id means every studio shop ("All Shops"). */
export function shopWhere(shopId: string | null | undefined): Prisma.TransactionWhereInput {
  return shopId ? { shopId } : { shop: { type: "STUDIO" } };
}

/** NextResponse-ready payload for a ShopError, or null for anything else. */
export function shopErrorBody(error: unknown): { body: { error: string }; status: number } | null {
  return error instanceof ShopError ? { body: { error: error.message }, status: error.status } : null;
}

/** Case-insensitive name clash check (the DB unique index is case-sensitive). */
export async function shopNameTaken(name: string, exceptId?: string, db: Pick<typeof prisma, "shop"> = prisma) {
  const clash = await db.shop.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return !!clash;
}
