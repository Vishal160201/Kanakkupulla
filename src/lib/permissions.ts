// Shared by the client (usePermissions) and the server (authz, /api/permissions).
// Keep this file free of server-only imports.

export const ROLES = ["ADMIN", "STAFF", "PHOTOGRAPHER"] as const;
export type AppRole = (typeof ROLES)[number];

export const PERMISSIONS = [
  "manage_bookings",
  "view_transactions",
  "manage_transactions",
  "view_analytics",
  "manage_users",
  "view_galleries",
  "manage_galleries",
  "view_export_analytics",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const DEFAULT_MATRIX: Record<AppRole, Record<Permission, boolean>> = {
  ADMIN: {
    manage_bookings: true,
    view_transactions: true,
    manage_transactions: true,
    view_analytics: true,
    manage_users: true,
    view_galleries: true,
    manage_galleries: true,
    view_export_analytics: true,
  },
  STAFF: {
    manage_bookings: true,
    view_transactions: true,
    manage_transactions: false,
    view_analytics: true,
    manage_users: false,
    view_galleries: true,
    manage_galleries: false,
    view_export_analytics: false,
  },
  PHOTOGRAPHER: {
    manage_bookings: false,
    view_transactions: false,
    manage_transactions: false,
    view_analytics: false,
    manage_users: false,
    view_galleries: true,
    manage_galleries: true,
    view_export_analytics: false,
  },
};

export function isRole(value: unknown): value is AppRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}
