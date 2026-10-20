import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import type { ShopType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  FULL_ACCESS,
  NO_ACCESS,
  STUDIO_ONLY_MODULES,
  levelAtLeast,
  maxLevel,
  normalizePermissions,
  type AccessLevel,
  type ModuleKey,
  type PermissionMap,
  type RoleKey,
} from "@/lib/access";

export type UserRole = "OWNER" | "MEMBER";

export type SessionUser = {
  id: string;
  role: UserRole;
  email: string | null;
  name: string | null;
};

type AuthResult =
  | { user: SessionUser; error?: undefined }
  | { user?: undefined; error: NextResponse };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const forbidden = (message = "You don't have permission to do that.") => NextResponse.json({ error: message }, { status: 403 });

export const isOwner = (user: Pick<SessionUser, "role">) => user.role === "OWNER";

/** Returns the signed-in, active user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || user.status === "INACTIVE" || (user.role !== "OWNER" && user.role !== "MEMBER")) return null;
  return { id: user.id, role: user.role, email: user.email ?? null, name: user.name ?? null };
}

export async function requireUser(): Promise<AuthResult> {
  const user = await getSessionUser();
  return user ? { user } : { error: unauthorized() };
}

/** Owner-only areas: settings, roles, shops, users, integrations, permanent deletes. */
export async function requireOwner(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  return isOwner(user) ? { user } : { error: forbidden("Only owners can do that.") };
}

// ---------------------------------------------------------------------------
// Access engine: per-shop roles → per-module levels
// ---------------------------------------------------------------------------

export interface ShopAccess {
  shopId: string;
  shopName: string;
  shopType: ShopType;
  roleKey: RoleKey;
  roleName: string;
  permissions: PermissionMap;
}

export interface UserAccess {
  isOwner: boolean;
  /** Studio-wide modules: the highest level across the member's studio-shop roles. */
  studio: PermissionMap;
  shops: ShopAccess[];
}

// Short-lived cache so a burst of requests doesn't re-read the role tables every time.
const ACCESS_TTL_MS = 10_000;
const accessCache = new Map<string, { at: number; value: UserAccess }>();

export function clearAccessCache(userId?: string) {
  if (userId) accessCache.delete(userId);
  else accessCache.clear();
}

export async function getUserAccess(user: Pick<SessionUser, "id" | "role">): Promise<UserAccess> {
  if (isOwner(user)) return { isOwner: true, studio: FULL_ACCESS, shops: [] };

  const cached = accessCache.get(user.id);
  if (cached && Date.now() - cached.at < ACCESS_TTL_MS) return cached.value;

  const memberships = await prisma.shopMember.findMany({
    where: { userId: user.id, shop: { isArchived: false } },
    select: {
      shop: { select: { id: true, name: true, type: true } },
      role: { select: { key: true, name: true, permissions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const shops: ShopAccess[] = memberships.map(m => ({
    shopId: m.shop.id,
    shopName: m.shop.name,
    shopType: m.shop.type,
    roleKey: m.role.key as RoleKey,
    roleName: m.role.name,
    permissions: normalizePermissions(m.role.permissions),
  }));

  const studio = { ...NO_ACCESS };
  for (const shop of shops) {
    if (shop.shopType !== "STUDIO") continue;
    for (const key of Object.keys(studio) as ModuleKey[]) studio[key] = maxLevel(studio[key], shop.permissions[key]);
  }

  const value: UserAccess = { isOwner: false, studio, shops };
  accessCache.set(user.id, { at: Date.now(), value });
  return value;
}

/**
 * Whether the user has `level` on `module`. With a shop id the role in that shop decides;
 * without one (studio-wide data) the folded studio level does. Studio-only modules always
 * use the studio level.
 */
export async function can(
  user: Pick<SessionUser, "id" | "role">,
  module: ModuleKey,
  level: AccessLevel,
  shopId?: string | null
): Promise<boolean> {
  const access = await getUserAccess(user);
  if (access.isOwner) return true;
  if (shopId && !STUDIO_ONLY_MODULES.includes(module)) {
    const shop = access.shops.find(s => s.shopId === shopId);
    return !!shop && levelAtLeast(shop.permissions[module], level);
  }
  return levelAtLeast(access.studio[module], level);
}

/** Route guard: signed in and allowed `level` on `module` (optionally in one shop). */
export async function requireAccess(module: ModuleKey, level: AccessLevel, shopId?: string | null): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  return (await can(user, module, level, shopId)) ? { user } : { error: forbidden() };
}

/** Passes when any of the (module, level) pairs is allowed (studio scope). */
export async function requireAnyAccess(...checks: [ModuleKey, AccessLevel][]): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  for (const [module, level] of checks) if (await can(user, module, level)) return { user };
  return { error: forbidden() };
}

/** For server actions: throws instead of returning a response. */
export async function assertAccess(...checks: [ModuleKey, AccessLevel][]): Promise<SessionUser> {
  const result = await requireAnyAccess(...checks);
  if (result.error) throw new Error(result.error.status === 401 ? "Unauthorized" : "Forbidden");
  return result.user;
}

/** Cron endpoints: require `Authorization: Bearer $CRON_SECRET`. Fails closed when the secret is unset. */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok =
    !!secret &&
    header.length === expected.length &&
    timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  return ok ? null : forbidden();
}

/**
 * Ledger writes: Daily Kanakku MANAGE in the entry's shop, or — for payments tied to a booking
 * or gift order — Manage on bookings / gifts (booking advances, gift order payments).
 */
export async function canWriteTransaction(
  user: SessionUser,
  tx: { bookingId?: string | null; productOrderId?: string | null; shopId?: string | null }
): Promise<boolean> {
  if (await can(user, "ledger", "MANAGE", tx.shopId)) return true;
  if (tx.bookingId && (await can(user, "bookings", "MANAGE"))) return true;
  if (tx.productOrderId && (await can(user, "gifts", "MANAGE"))) return true;
  return false;
}

export function forbiddenResponse(message?: string) {
  return forbidden(message);
}
