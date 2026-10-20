"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetcher } from "@/lib/fetcher";
import { modulesForShopType, type AppModule } from "@/lib/shopModules";
import type { ActiveShopId, Shop, ShopListResponse, ShopType } from "@/types/shops";

export const SHOPS_KEY = "/api/shops?includeArchived=true";

/** STUDIO shops (anything not explicitly another type, so older payloads still work). */
export const isStudioShop = (shop: Pick<Shop, "type">) => shop.type !== "FERTILIZER";

/** A shop's type, defaulting to STUDIO. */
export const shopTypeOf = (shop: Pick<Shop, "type"> | null | undefined): ShopType =>
  shop?.type === "FERTILIZER" ? "FERTILIZER" : "STUDIO";

interface ShopContextType {
  /** Active (non-archived) shops, default first. */
  shops: Shop[];
  /** Every shop including archived ones (for Settings and labelling old entries). */
  allShops: Shop[];
  defaultShopId: string | null;
  /** The switcher selection. Resolved to a valid value once shops have loaded. */
  activeShopId: ActiveShopId;
  /** The active shop, or null when viewing all (studio) shops. */
  activeShop: Shop | null;
  /** Type of the active shop; "All Shops" is STUDIO. */
  activeShopType: ShopType;
  /** App modules available in the active shop (sidebar, route guard). */
  allowedModules: readonly AppModule[];
  /** Whether "All Shops" (every studio shop) can be selected: owners with several studio shops. */
  canViewAllShops: boolean;
  setActiveShopId: (id: ActiveShopId) => void;
  refreshShops: () => Promise<unknown>;
  isLoading: boolean;
  /** False until the shop list has loaded (or failed), i.e. until `activeShopId` is final. */
  isReady: boolean;
  /** See useShopQueryParam(). */
  shopQueryParam: string | null;
}

const ShopContext = createContext<ShopContextType>({
  shops: [],
  allShops: [],
  defaultShopId: null,
  activeShopId: "all",
  activeShop: null,
  activeShopType: "STUDIO",
  allowedModules: modulesForShopType("STUDIO"),
  canViewAllShops: false,
  setActiveShopId: () => {},
  refreshShops: async () => undefined,
  isLoading: true,
  isReady: false,
  shopQueryParam: null,
});

// ---------------------------------------------------------------------------
// Persisted selection: localStorage (with an in-memory fallback when storage is
// unavailable), read through useSyncExternalStore so the server render and
// hydration use `null` and the stored value only applies after mount.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "kanakku.activeShopId";
/** Type of the stored shop, so the right modules/layout apply before /api/shops answers. */
const TYPE_STORAGE_KEY = "kanakku.activeShopType";
const listeners = new Set<() => void>();
const memoryValues = new Map<string, string>();

const readKey = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key) ?? memoryValues.get(key) ?? null;
  } catch {
    return memoryValues.get(key) ?? null;
  }
};

const writeKey = (key: string, value: string) => {
  memoryValues.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode etc.): the in-memory value still applies for this tab.
  }
};

const readStored = () => readKey(STORAGE_KEY);
const readStoredType = () => readKey(TYPE_STORAGE_KEY);

const writeStored = (id: string, type: ShopType) => {
  writeKey(STORAGE_KEY, id);
  writeKey(TYPE_STORAGE_KEY, type);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === TYPE_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const getServerSnapshot = () => null;

/**
 * Picks a valid selection: the stored one if still usable, otherwise the default shop
 * (or the first accessible one). "All Shops" is only allowed when `allowAll` (owners
 * with several studio shops), and is also their starting view when nothing is stored.
 * Members only get the shops they are assigned to, and never "All Shops".
 */
function resolveActiveShopId(
  stored: string | null,
  shops: Shop[],
  defaultShopId: string | null,
  allowAll: boolean
): ActiveShopId {
  if (shops.length === 0) return "all";
  if ((stored === "all" || stored === null) && allowAll) return "all";
  if (stored && stored !== "all" && shops.some((s) => s.id === stored)) return stored;
  if (defaultShopId && shops.some((s) => s.id === defaultShopId)) return defaultShopId;
  return (shops.find(isStudioShop) ?? shops[0]).id;
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  // Only owners can see every shop at once; members get their assigned shops from /api/shops.
  const isOwner = session?.user?.role === "OWNER";
  const { data, error, isLoading, mutate } = useSWR<ShopListResponse>(
    status === "authenticated" ? SHOPS_KEY : null,
    fetcher,
    // Shops rarely change; Settings → Shops calls refreshShops() after edits.
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const stored = useSyncExternalStore(subscribe, readStored, getServerSnapshot);
  const storedType = useSyncExternalStore(subscribe, readStoredType, getServerSnapshot);

  const allShops = useMemo(() => data?.shops ?? [], [data]);
  const shops = useMemo(() => allShops.filter((s) => !s.isArchived), [allShops]);
  const defaultShopId = data?.defaultShopId ?? null;
  // "All Shops" means every studio shop; with a single studio shop it is the same view as that shop.
  const studioShopCount = shops.filter(isStudioShop).length;
  const canViewAllShops = isOwner && studioShopCount > 1;

  // If the shops API fails, fall back to the unfiltered view so the ledger still works.
  const isReady = !!data || !!error || status === "unauthenticated";
  const activeShopId = data ? resolveActiveShopId(stored, shops, defaultShopId, canViewAllShops) : "all";
  const activeShop = activeShopId === "all" ? null : shops.find((s) => s.id === activeShopId) ?? null;
  // Until the shop list arrives, assume the stored shop's type (STUDIO when unknown).
  const activeShopType = isReady ? shopTypeOf(activeShop) : storedType === "FERTILIZER" ? "FERTILIZER" : "STUDIO";
  const allowedModules = modulesForShopType(activeShopType);

  // Remember the validated selection (stale id, a member's "all", first visit) so the next
  // page load can start its data fetches with the right shop straight away.
  useEffect(() => {
    if (data && (activeShopId !== stored || activeShopType !== storedType)) writeStored(activeShopId, activeShopType);
  }, [data, activeShopId, activeShopType, stored, storedType]);

  // Query fragment for data fetches. Before the shop list arrives it is derived
  // optimistically from the stored selection, so ledger/dashboard requests run in
  // parallel with /api/shops instead of after it; if the stored value turns out to be
  // invalid, the resolved value differs and SWR refetches with the corrected key.
  // `stored` is null during the server render and hydration, so this stays hydration-safe.
  let shopQueryParam: string | null;
  if (isReady) {
    shopQueryParam = activeShopId === "all" ? "" : `shopId=${encodeURIComponent(activeShopId)}`;
  } else if (stored && stored !== "all") {
    shopQueryParam = `shopId=${encodeURIComponent(stored)}`;
  } else if (isOwner) {
    // Stored "All Shops", or a first visit: owners start on All Shops.
    shopQueryParam = "";
  } else {
    // Members have no "All Shops" (a stored "all" is invalid for them): wait for their shops from /api/shops.
    shopQueryParam = null;
  }

  const setActiveShopId = useCallback(
    (id: ActiveShopId) => writeStored(id, id === "all" ? "STUDIO" : shopTypeOf(shops.find((s) => s.id === id))),
    [shops]
  );
  const refreshShops = useCallback(() => mutate(), [mutate]);

  const value = useMemo<ShopContextType>(
    () => ({
      shops,
      allShops,
      defaultShopId,
      activeShopId,
      activeShop,
      activeShopType,
      allowedModules,
      canViewAllShops,
      setActiveShopId,
      refreshShops,
      isLoading,
      isReady,
      shopQueryParam,
    }),
    [
      shops,
      allShops,
      defaultShopId,
      activeShopId,
      activeShop,
      activeShopType,
      allowedModules,
      canViewAllShops,
      setActiveShopId,
      refreshShops,
      isLoading,
      isReady,
      shopQueryParam,
    ]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShops() {
  return useContext(ShopContext);
}

/**
 * Query fragment for the active shop: `""` for all (studio) shops, `"shopId=<id>"` for one,
 * or `null` while it can't be known yet (use it to hold back SWR keys). Before the shop
 * list has loaded it comes from the stored selection, so fetches don't wait for
 * /api/shops; it is corrected (changing the key) only if that selection was invalid.
 */
export function useShopQueryParam(): string | null {
  return useShops().shopQueryParam;
}

/** Appends a query fragment (e.g. from useShopQueryParam) to a URL that may already have a query. */
export function withQuery(url: string, fragment: string): string {
  if (!fragment) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${fragment}`;
}
