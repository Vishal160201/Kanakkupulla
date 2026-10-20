"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetcher } from "@/lib/fetcher";
import { levelAtLeast, STUDIO_ONLY_MODULES, type AccessLevel, type ModuleKey } from "@/lib/access";
import { modulesForShopType, type ShopTypeName } from "@/lib/shopModules";
import { shopTypeOf, useShops } from "@/components/providers/ShopProvider";
import { APP_MODULE_OF } from "@/components/shops/moduleAccess";
import type { MeAccessResponse, ShopAccess } from "@/types/access";

export const ACCESS_KEY = "/api/me/access";

/** Tooltip shown on controls the user can't use. */
export const NO_PERMISSION = "You don't have permission";

export type CanFn = (module: ModuleKey, level?: AccessLevel, shopId?: string) => boolean;
export type ActiveShopCanFn = (module: ModuleKey, level?: AccessLevel) => boolean;

/**
 * Optimistic answer while access is unknown: pages of modules the shop type has may
 * render (so they don't flash a "no access" state), but nothing may be changed.
 */
function loadingAnswer(module: ModuleKey, level: AccessLevel, type: ShopTypeName): boolean {
  return level !== "MANAGE" && modulesForShopType(type).includes(APP_MODULE_OF[module]);
}

/**
 * The signed-in user's permissions (GET /api/me/access).
 *
 * `can(module, level = "VIEW", shopId?)`:
 * - owners: always true;
 * - with a shopId: the user's role in that shop (nothing when not assigned). Studio
 *   modules (dashboard, bookings, albums, gifts, analytics) aren't shop data, so they
 *   always use the studio-wide level, like the server does;
 * - without one (or "all"): the studio-wide map.
 */
export function useAccess() {
  const { data: session, status } = useSession();
  const { allShops } = useShops();
  const { data, error } = useSWR<MeAccessResponse>(status === "authenticated" ? ACCESS_KEY : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const access = data ?? null;
  // The session role answers straight away; the API (fresher) wins once it arrives.
  const isOwner = access ? access.isOwner : session?.user?.role === "OWNER";
  const isLoading = !isOwner && !access && !error && status !== "unauthenticated";

  const shopsById = useMemo(() => new Map((access?.shops ?? []).map((s) => [s.shopId, s])), [access]);

  const can = useCallback<CanFn>(
    (module, level = "VIEW", shopId) => {
      if (isOwner) return true;
      const scoped = shopId && shopId !== "all" ? shopId : undefined;
      if (!access) {
        if (!isLoading) return false;
        const type = scoped ? shopTypeOf(allShops.find((s) => s.id === scoped)) : "STUDIO";
        return loadingAnswer(module, level, type);
      }
      const have =
        scoped && !STUDIO_ONLY_MODULES.includes(module)
          ? shopsById.get(scoped)?.permissions[module]
          : access.studio[module];
      return levelAtLeast(have, level);
    },
    [isOwner, access, isLoading, allShops, shopsById]
  );

  /** The member's assignment in a shop (role name/key), if any. */
  const shopAccess = useCallback((shopId: string): ShopAccess | undefined => shopsById.get(shopId), [shopsById]);

  return { isOwner, isLoading, access, can, shopAccess };
}

/**
 * `can` bound to the shop picked in the header ("All Shops" uses the studio map).
 * Until the shop list has loaded it answers optimistically for the stored shop's type.
 */
export function useActiveShopCan(): ActiveShopCanFn {
  const { can, isOwner } = useAccess();
  const { activeShopId, activeShopType, isReady } = useShops();
  return useCallback<ActiveShopCanFn>(
    (module, level = "VIEW") => {
      if (isOwner) return true;
      if (!isReady) return loadingAnswer(module, level, activeShopType);
      return can(module, level, activeShopId === "all" ? undefined : activeShopId);
    },
    [can, isOwner, isReady, activeShopId, activeShopType]
  );
}

/** The ledger fields that decide who may edit or delete an entry. */
export interface LedgerEntryRef {
  shopId?: string | null;
  bookingId?: string | null;
  productOrderId?: string | null;
}

/**
 * Mirrors the server's ledger write rule: Daily Kanakku Manage in the entry's shop, or —
 * for payments tied to a booking / gift order — Bookings / Gifts Manage. Without an entry
 * it answers for a new entry in the active shop.
 */
export function useCanWriteTransaction(): (entry?: LedgerEntryRef | null) => boolean {
  const { can, isOwner } = useAccess();
  const activeCan = useActiveShopCan();
  return useCallback(
    (entry) => {
      if (isOwner) return true;
      if (!entry) return activeCan("ledger", "MANAGE");
      if (entry.shopId !== undefined ? can("ledger", "MANAGE", entry.shopId ?? undefined) : activeCan("ledger", "MANAGE")) return true;
      if (entry.bookingId && can("bookings", "MANAGE")) return true;
      if (entry.productOrderId && can("gifts", "MANAGE")) return true;
      return false;
    },
    [can, isOwner, activeCan]
  );
}
