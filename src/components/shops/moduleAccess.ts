// Ties app pages (src/lib/shopModules AppModule / paths) to permission modules (src/lib/access ModuleKey).

import type { AccessLevel, ModuleKey } from "@/lib/access";
import { moduleForPath, type AppModule } from "@/lib/shopModules";

/** The shop-type module (sidebar section) a permission module lives in. */
export const APP_MODULE_OF: Record<ModuleKey, AppModule> = {
  dashboard: "dashboard",
  bookings: "bookings",
  albums: "bookings",
  gifts: "gifts",
  analytics: "analytics",
  ledger: "transactions",
  inventory: "inventory",
  recycle_bin: "settings",
};

/** Permission module a page belongs to, or null for pages everyone may open (settings, "/"). */
export function accessModuleForPath(pathname: string): ModuleKey | null {
  if (pathname === "/bookings/album-status" || pathname.startsWith("/bookings/album-status/")) return "albums";
  switch (moduleForPath(pathname)) {
    case "dashboard": return "dashboard";
    case "bookings": return "bookings";
    case "transactions": return "ledger";
    case "gifts": return "gifts";
    case "analytics": return "analytics";
    case "inventory": return "inventory";
    default: return null;
  }
}

/** Landing page of each viewable module, in sidebar order (first match wins). */
const MODULE_LANDINGS: { module: ModuleKey; path: string }[] = [
  { module: "dashboard", path: "/dashboard/overview" },
  { module: "bookings", path: "/bookings/overview" },
  { module: "albums", path: "/bookings/album-status" },
  { module: "ledger", path: "/transactions/overview" },
  { module: "inventory", path: "/inventory" },
  { module: "gifts", path: "/gifts" },
  { module: "analytics", path: "/analytics" },
];

/** First page the user may view in the active shop, or /settings when there is none. */
export function firstViewablePath(
  can: (module: ModuleKey, level?: AccessLevel) => boolean,
  allowedModules: readonly AppModule[]
): string {
  const hit = MODULE_LANDINGS.find(
    ({ module }) => allowedModules.includes(APP_MODULE_OF[module]) && can(module, "VIEW")
  );
  return hit?.path ?? "/settings";
}
