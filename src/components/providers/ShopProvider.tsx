"use client";

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetcher } from "@/lib/fetcher";
import type { ActiveShopId, Shop, ShopListResponse } from "@/types/shops";

export const SHOPS_KEY = "/api/shops?includeArchived=true";

interface ShopContextType {
  /** Active (non-archived) shops, default first. */
  shops: Shop[];
  /** Every shop including archived ones (for Settings and labelling old entries). */
  allShops: Shop[];
  defaultShopId: string | null;
  /** The switcher selection. Resolved to a valid value once shops have loaded. */
  activeShopId: ActiveShopId;
  /** The active shop, or null when viewing all shops. */
  activeShop: Shop | null;
  setActiveShopId: (id: ActiveShopId) => void;
  refreshShops: () => Promise<unknown>;
  isLoading: boolean;
  /** False until the shop list has loaded (or failed), i.e. until `activeShopId` is final. */
  isReady: boolean;
}

const ShopContext = createContext<ShopContextType>({
  shops: [],
  allShops: [],
  defaultShopId: null,
  activeShopId: "all",
  activeShop: null,
  setActiveShopId: () => {},
  refreshShops: async () => undefined,
  isLoading: true,
  isReady: false,
});

// ---------------------------------------------------------------------------
// Persisted selection: localStorage (with an in-memory fallback when storage is
// unavailable), read through useSyncExternalStore so the server render and
// hydration use `null` and the stored value only applies after mount.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "kanakku.activeShopId";
const listeners = new Set<() => void>();
let memoryValue: string | null = null;

const readStored = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryValue;
  } catch {
    return memoryValue;
  }
};

const writeStored = (value: string) => {
  memoryValue = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage blocked (private mode etc.): the in-memory value still applies for this tab.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const getServerSnapshot = () => null;

/** Picks a valid selection: the stored one if still usable, otherwise the default shop. */
function resolveActiveShopId(stored: string | null, shops: Shop[], defaultShopId: string | null): ActiveShopId {
  if (shops.length === 0) return "all";
  // With a single shop "All Shops" and that shop are the same view; the switcher is hidden.
  if (shops.length === 1) return shops[0].id;
  if (stored === "all") return "all";
  if (stored && shops.some((s) => s.id === stored)) return stored;
  if (defaultShopId && shops.some((s) => s.id === defaultShopId)) return defaultShopId;
  return shops[0].id;
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { data, error, isLoading, mutate } = useSWR<ShopListResponse>(
    status === "authenticated" ? SHOPS_KEY : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const stored = useSyncExternalStore(subscribe, readStored, getServerSnapshot);

  const allShops = useMemo(() => data?.shops ?? [], [data]);
  const shops = useMemo(() => allShops.filter((s) => !s.isArchived), [allShops]);
  const defaultShopId = data?.defaultShopId ?? null;

  // If the shops API fails, fall back to the unfiltered view so the ledger still works.
  const isReady = !!data || !!error || status === "unauthenticated";
  const activeShopId = data ? resolveActiveShopId(stored, shops, defaultShopId) : "all";
  const activeShop = activeShopId === "all" ? null : shops.find((s) => s.id === activeShopId) ?? null;

  const setActiveShopId = useCallback((id: ActiveShopId) => writeStored(id), []);
  const refreshShops = useCallback(() => mutate(), [mutate]);

  const value = useMemo<ShopContextType>(
    () => ({
      shops,
      allShops,
      defaultShopId,
      activeShopId,
      activeShop,
      setActiveShopId,
      refreshShops,
      isLoading,
      isReady,
    }),
    [shops, allShops, defaultShopId, activeShopId, activeShop, setActiveShopId, refreshShops, isLoading, isReady]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShops() {
  return useContext(ShopContext);
}

/**
 * Query fragment for the active shop: `""` for all shops, `"shopId=<id>"` for one,
 * or `null` while the shop list is still loading (use it to hold back SWR keys so
 * the wrong shop's data never flashes on screen).
 */
export function useShopQueryParam(): string | null {
  const { activeShopId, isReady } = useShops();
  if (!isReady) return null;
  return activeShopId === "all" ? "" : `shopId=${encodeURIComponent(activeShopId)}`;
}

/** Appends a query fragment (e.g. from useShopQueryParam) to a URL that may already have a query. */
export function withQuery(url: string, fragment: string): string {
  if (!fragment) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${fragment}`;
}
