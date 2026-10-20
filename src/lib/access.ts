// Permission model shared by the client and the server. Owners can do everything; everyone
// else gets access through per-shop role assignments (Admin / Staff). Keep free of server-only imports.

export const ACCESS_LEVELS = ["NONE", "VIEW", "MANAGE"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const ROLE_KEYS = ["ADMIN", "STAFF"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export type ModuleKey = "dashboard" | "bookings" | "albums" | "gifts" | "analytics" | "ledger" | "inventory" | "recycle_bin";

export interface AccessModule {
  key: ModuleKey;
  label: string;
  description: string;
  /** Phosphor icon name (rendered as `ph-bold ph-<icon>`). */
  icon: string;
  /** studio: studio-wide data; shop: data of one shop; all: both. */
  appliesTo: "studio" | "shop" | "all";
  levels: readonly AccessLevel[];
}

export const ACCESS_MODULES: readonly AccessModule[] = [
  { key: "dashboard", label: "Dashboard", description: "Studio overview, targets and upcoming shoots", icon: "squares-four", appliesTo: "studio", levels: ["NONE", "VIEW"] },
  { key: "bookings", label: "Bookings", description: "Shoots, clients and booking payments", icon: "calendar-blank", appliesTo: "studio", levels: ACCESS_LEVELS },
  { key: "albums", label: "Album status", description: "Album production and gallery delivery", icon: "images", appliesTo: "studio", levels: ACCESS_LEVELS },
  { key: "gifts", label: "Gifts & Frames", description: "Product orders and their payments", icon: "gift", appliesTo: "studio", levels: ACCESS_LEVELS },
  { key: "analytics", label: "Analytics", description: "Reports; Manage also allows exports", icon: "chart-bar", appliesTo: "studio", levels: ACCESS_LEVELS },
  { key: "ledger", label: "Daily Kanakku", description: "Income and expense entries of the shop", icon: "notebook", appliesTo: "all", levels: ACCESS_LEVELS },
  { key: "inventory", label: "Fertilizer Inventory", description: "Products, sales, purchases and farmer credit", icon: "package", appliesTo: "shop", levels: ACCESS_LEVELS },
  { key: "recycle_bin", label: "Recycle Bin", description: "Trashed items; Manage allows restoring", icon: "trash", appliesTo: "all", levels: ACCESS_LEVELS },
];

export const MODULE_KEYS = ACCESS_MODULES.map(m => m.key) as ModuleKey[];
export const STUDIO_ONLY_MODULES: readonly ModuleKey[] = ACCESS_MODULES.filter(m => m.appliesTo === "studio").map(m => m.key);

export type PermissionMap = Record<ModuleKey, AccessLevel>;

const RANK: Record<AccessLevel, number> = { NONE: 0, VIEW: 1, MANAGE: 2 };

export function levelAtLeast(have: AccessLevel | undefined, need: AccessLevel): boolean {
  return RANK[have ?? "NONE"] >= RANK[need];
}

export function maxLevel(a: AccessLevel, b: AccessLevel): AccessLevel {
  return RANK[a] >= RANK[b] ? a : b;
}

export function isAccessLevel(value: unknown): value is AccessLevel {
  return typeof value === "string" && (ACCESS_LEVELS as readonly string[]).includes(value);
}

/** Fills missing / invalid entries with NONE and clamps levels a module doesn't support. */
export function normalizePermissions(raw: unknown): PermissionMap {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as PermissionMap;
  for (const m of ACCESS_MODULES) {
    const value = source[m.key];
    let level: AccessLevel = isAccessLevel(value) ? value : "NONE";
    if (!m.levels.includes(level)) level = m.levels[m.levels.length - 1];
    out[m.key] = level;
  }
  return out;
}

export const NO_ACCESS: PermissionMap = normalizePermissions({});
export const FULL_ACCESS: PermissionMap = normalizePermissions(Object.fromEntries(MODULE_KEYS.map(k => [k, "MANAGE"])));

export const NOTIFICATION_TYPES = [
  { type: "BOOKING_CREATED", label: "New booking" },
  { type: "BOOKING_UPDATED", label: "Booking updated" },
  { type: "PAYMENT_RECEIVED", label: "Payment received" },
  { type: "PAYMENT_OVERDUE", label: "Payment overdue" },
  { type: "PAYMENT_DUE_REMINDER", label: "Payment due soon" },
  { type: "ADVANCE_NOT_COLLECTED", label: "Advance not collected" },
  { type: "ORDER_CREATED", label: "New gift order" },
  { type: "ORDER_STATUS_CHANGED", label: "Gift order status changed" },
  { type: "ORDER_DELIVERED", label: "Gift order delivered" },
  { type: "ORDER_STATUS_STALE", label: "Gift order stuck" },
  { type: "BOOKING_STATUS_STALE", label: "Booking status stuck" },
  { type: "GALLERY_DELIVERED", label: "Gallery delivered" },
  { type: "GALLERY_NOT_DELIVERED", label: "Gallery not delivered" },
  { type: "ALBUM_PENDING_REMINDER", label: "Album pending" },
  { type: "HOT_DATE_ALERT", label: "Hot date" },
] as const;
export type NotificationTypeKey = (typeof NOTIFICATION_TYPES)[number]["type"];
