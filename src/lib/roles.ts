import prisma from "@/lib/prisma";
import { NOTIFICATION_TYPES, normalizePermissions, type NotificationTypeKey, type RoleKey } from "@/lib/access";

export const OWNER_NOTIFICATIONS_SETTING = "owner_notifications";

type NotificationMap = Record<NotificationTypeKey, boolean>;

/** Fills in defaults: owners and Admins get every alert unless switched off; Staff none unless switched on. */
export function normalizeNotifications(raw: unknown, holder: "OWNER" | RoleKey): NotificationMap {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const fallback = holder !== "STAFF";
  return Object.fromEntries(
    NOTIFICATION_TYPES.map(({ type }) => [type, typeof source[type] === "boolean" ? (source[type] as boolean) : fallback])
  ) as NotificationMap;
}

export async function getOwnerNotifications(): Promise<NotificationMap> {
  const row = await prisma.systemSetting.findUnique({ where: { key: OWNER_NOTIFICATIONS_SETTING } });
  return normalizeNotifications(row?.value, "OWNER");
}

export async function listRoles() {
  const roles = await prisma.accessRole.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assignments: true } } },
  });
  return roles.map(({ _count, ...role }) => ({
    id: role.id,
    key: role.key as RoleKey,
    name: role.name,
    description: role.description,
    permissions: normalizePermissions(role.permissions),
    notifications: normalizeNotifications(role.notifications, role.key as RoleKey),
    assignmentCount: _count.assignments,
  }));
}
