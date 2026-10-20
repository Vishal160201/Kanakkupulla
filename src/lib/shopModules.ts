// Which app modules each shop type has. Shared by the client (sidebar, route guard,
// shop picker) and the server (API checks). Keep free of server-only imports.

export const SHOP_TYPES = ["STUDIO", "FERTILIZER"] as const;
export type ShopTypeName = (typeof SHOP_TYPES)[number];

export type AppModule = "dashboard" | "bookings" | "transactions" | "gifts" | "analytics" | "inventory" | "farmers" | "produce" | "settings";

const MODULE_PATHS: Record<AppModule, string> = {
  dashboard: "/dashboard",
  bookings: "/bookings",
  transactions: "/transactions",
  gifts: "/gifts",
  analytics: "/analytics",
  inventory: "/inventory",
  farmers: "/farmers",
  produce: "/produce",
  settings: "/settings",
};

export const SHOP_TYPE_MODULES: Record<ShopTypeName, readonly AppModule[]> = {
  STUDIO: ["dashboard", "bookings", "transactions", "gifts", "analytics", "settings"],
  FERTILIZER: ["transactions", "inventory", "farmers", "produce", "settings"],
};

export const SHOP_TYPE_LABELS: Record<ShopTypeName, string> = {
  STUDIO: "Studio",
  FERTILIZER: "Fertilizer shop",
};

/** Heading the shop picker groups a type under. */
export const SHOP_TYPE_GROUPS: Record<ShopTypeName, "STUDIO" | "OTHERS"> = {
  STUDIO: "STUDIO",
  FERTILIZER: "OTHERS",
};

export function isShopType(value: unknown): value is ShopTypeName {
  return typeof value === "string" && (SHOP_TYPES as readonly string[]).includes(value);
}

export function modulesForShopType(type: ShopTypeName): readonly AppModule[] {
  return SHOP_TYPE_MODULES[type];
}

/** Module a path belongs to, or null for paths outside the module system (e.g. "/"). */
export function moduleForPath(pathname: string): AppModule | null {
  for (const [appModule, prefix] of Object.entries(MODULE_PATHS) as [AppModule, string][]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return appModule;
  }
  return null;
}

export function isPathAllowedForShopType(pathname: string, type: ShopTypeName): boolean {
  const appModule = moduleForPath(pathname);
  return appModule === null || SHOP_TYPE_MODULES[type].includes(appModule);
}

/** Where to land after switching to a shop of this type. */
export function landingPathForShopType(type: ShopTypeName): string {
  return type === "STUDIO" ? "/dashboard/overview" : "/transactions/overview";
}

/** Form layout that defines a shop type's Daily Kanakku fields and categories. */
export function transactionFormKeyForShopType(type: ShopTypeName): "TRANSACTION_FORM" | "FERTILIZER_TRANSACTION_FORM" {
  return type === "FERTILIZER" ? "FERTILIZER_TRANSACTION_FORM" : "TRANSACTION_FORM";
}

/** Ledger categories the inventory posts automatically for fertilizer shops. */
export const INVENTORY_LEDGER_CATEGORIES = {
  SALE: "Fertilizer Sales",
  PURCHASE: "Stock Purchase",
  CREDIT_PAYMENT: "Credit Collection",
} as const;

/** Ledger categories the produce trade (crops bought from farmers, sold to buyers) posts automatically. */
export const PRODUCE_LEDGER_CATEGORIES = {
  /** Cash paid to a farmer for produce (expense) */
  FARMER_PAYMENT: "Produce Payment",
  /** Received when selling produce to a buyer (income) */
  SALE: "Produce Sales",
  /** Received later against a buyer's dues (income) */
  SALE_COLLECTION: "Produce Sale Collection",
} as const;
export const INVENTORY_PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque"] as const;
