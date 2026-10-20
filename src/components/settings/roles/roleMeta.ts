import type { AccessLevel, AccessModule, RoleKey } from "@/lib/access";

/** Columns of the permission / notification grids: the fixed Owner plus the per-shop roles. */
export type RoleColumnKey = "OWNER" | RoleKey;

export interface RoleMeta {
  label: string;
  /** Phosphor icon name. */
  icon: string;
  /** Default description when the API has none. */
  description: string;
  /** Small pill (bg + text + border). */
  badge: string;
  /** Solid icon tile. */
  tile: string;
}

export const ROLE_META: Record<RoleColumnKey, RoleMeta> = {
  OWNER: {
    label: "Owner",
    icon: "crown",
    description: "Full access to every shop and setting",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    tile: "bg-orange-500 text-white",
  },
  ADMIN: {
    label: "Admin",
    icon: "shield-check",
    description: "Runs a shop day to day: records, edits and reviews everything in it",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    tile: "bg-indigo-500 text-white",
  },
  STAFF: {
    label: "Staff",
    icon: "user",
    description: "Works the counter or shoots: records entries with limited editing",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    tile: "bg-sky-500 text-white",
  },
};

export const SCOPE_LABELS: Record<AccessModule["appliesTo"], string> = {
  studio: "Studio",
  shop: "Each shop",
  all: "All",
};

export const SCOPE_HINTS: Record<AccessModule["appliesTo"], string> = {
  studio: "Studio-wide: uses the person's highest role across their studio shops",
  shop: "Uses the person's role in each shop",
  all: "Studio and other shops: uses the person's role in each shop",
};

export const LEVEL_LABELS: Record<AccessLevel, string> = {
  NONE: "None",
  VIEW: "View",
  MANAGE: "Manage",
};

/** Default when a role has no saved rule for a notification type. */
export const defaultNotificationFor = (role: RoleColumnKey): boolean => role !== "STAFF";

export const pluralize = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString("en-IN")} ${count === 1 ? one : many}`;
