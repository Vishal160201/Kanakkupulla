"use client";

import { useCallback, useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { fetcher, FetchError } from "@/lib/fetcher";
import { INVENTORY_PAYMENT_MODES } from "@/lib/shopModules";
import { PACK_TYPES, PACK_TYPE_HINTS, PACK_UNITS, packLabel, quantityUnit, type PackType } from "@/lib/inventoryPacks";
import type { DropdownOption } from "@/components/ui/CustomDropdown";
import { useActiveShopCan } from "@/hooks/useAccess";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** ₹ with Indian digit grouping, e.g. ₹1,23,456.5 → "₹1,23,456.50". */
export function formatINR(value: number | null | undefined, { decimals = true }: { decimals?: boolean } = {}): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals && !Number.isInteger(n) ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  return `${n < 0 ? "-" : ""}₹${abs}`;
}

/** Quantity with Indian grouping and up to 3 decimals. */
export function formatQty(value: number | null | undefined): string {
  return (Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Today as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Keeps digits and a single decimal point (for text inputs with inputMode="decimal"). */
export function sanitizeDecimal(raw: string, maxDecimals = 3): string {
  let cleaned = raw.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    const [int, frac] = cleaned.split(".");
    cleaned = `${int}.${frac.slice(0, maxDecimals)}`;
  }
  return cleaned;
}

/** Parses a decimal text value; NaN when empty or invalid. */
export function parseDecimal(raw: string): number {
  if (!raw || raw === ".") return NaN;
  return Number(raw);
}

/** Rounds money to paise to avoid floating-point noise in totals. */
export const roundMoney = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const PAYMENT_MODE_ICONS: Record<string, string> = {
  Cash: "money",
  UPI: "qr-code",
  "Bank Transfer": "bank",
  Cheque: "money-wavy",
};

export const PAYMENT_MODE_OPTIONS: DropdownOption[] = INVENTORY_PAYMENT_MODES.map((mode) => ({
  label: mode,
  value: mode,
  icon: PAYMENT_MODE_ICONS[mode],
}));

const PACK_TYPE_ICONS: Record<PackType, string> = {
  Bottle: "drop",
  Packet: "package",
  Bag: "archive-box",
  Loose: "scales",
  Piece: "cube",
};

export const PACK_TYPE_OPTIONS: DropdownOption[] = PACK_TYPES.map((type) => ({ label: type, value: type, icon: PACK_TYPE_ICONS[type], hint: PACK_TYPE_HINTS[type] }));

export const packUnitOptions = (type: string): DropdownOption[] =>
  (PACK_UNITS[type as PackType] ?? []).map((unit) => ({ label: unit, value: unit }));

/** Re-exported for the inventory screens. */
export { packLabel, quantityUnit };

/** Products at or below this quantity are listed as "low stock". */
export const LOW_STOCK_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/** JSON request through the shared fetcher (throws FetchError with the API's message). */
export async function sendJson<T = unknown>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  return fetcher(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** The `errors` payload of a FetchError, if any. */
export function errorDetails(err: unknown): unknown {
  if (err instanceof FetchError && err.info && typeof err.info === "object" && "errors" in err.info) {
    return (err.info as { errors: unknown }).errors;
  }
  return undefined;
}

export const inventoryUrl = (path: string, shopId: string, params: Record<string, string | number | undefined> = {}) => {
  const qs = new URLSearchParams({ shopId });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  return `/api/inventory/${path}?${qs.toString()}`;
};

/** Revalidates every cached /api/inventory* response (and the ledger, which sales/purchases post to). */
/** Whether the user may change this (the active) shop's inventory: sales, purchases, products, customers, payments. */
export function useCanManageInventory(): boolean {
  return useActiveShopCan()("inventory", "MANAGE");
}

export function useRevalidateInventory() {
  const { mutate } = useSWRConfig();
  return useCallback(
    // Key filter only (no data argument): keeps the cached data on screen and revalidates it.
    () => mutate((key) => typeof key === "string" && (key.startsWith("/api/inventory") || key.startsWith("/api/transactions"))),
    [mutate]
  );
}

/** `value`, updated only after it has stopped changing for `delay` ms (for search boxes). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
