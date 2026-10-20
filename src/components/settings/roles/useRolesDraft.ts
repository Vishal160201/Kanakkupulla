"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ACCESS_MODULES, NOTIFICATION_TYPES, normalizePermissions, type AccessLevel, type ModuleKey, type NotificationTypeKey, type PermissionMap } from "@/lib/access";
import type { AccessRole, NotificationRules, RolesResponse, UpdateRoleInput } from "@/types/settings";
import { defaultNotificationFor, type RoleColumnKey } from "./roleMeta";

/** Notification drafts are keyed by role id, plus this key for the Owner column. */
export const OWNER_KEY = "owner";

type PermissionOverrides = Record<string, Partial<PermissionMap>>;
type NotificationOverrides = Record<string, NotificationRules>;

const resolveNotification = (rules: NotificationRules | undefined, type: NotificationTypeKey, column: RoleColumnKey) =>
  rules?.[type] ?? defaultNotificationFor(column);

/** Full map for every type, filling gaps with the column's default. */
const fullNotifications = (rules: NotificationRules | undefined, column: RoleColumnKey, overrides?: NotificationRules) => {
  const out: NotificationRules = {};
  for (const { type } of NOTIFICATION_TYPES) out[type] = overrides?.[type] ?? resolveNotification(rules, type, column);
  return out;
};

async function putJson(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

/**
 * Local, unsaved edits to the role grids. Only values that differ from the server are kept,
 * so the change count and "Discard" are trivial and a re-fetch never clobbers the draft.
 */
export function useRolesDraft(data: RolesResponse | undefined, refresh: () => Promise<unknown>) {
  const [permOverrides, setPermOverrides] = useState<PermissionOverrides>({});
  const [notifOverrides, setNotifOverrides] = useState<NotificationOverrides>({});
  const [isSaving, setIsSaving] = useState(false);

  const roles = useMemo(() => data?.roles ?? [], [data]);
  const serverPermissions = useMemo(() => {
    const out: Record<string, PermissionMap> = {};
    for (const role of roles) out[role.id] = normalizePermissions(role.permissions);
    return out;
  }, [roles]);

  const levelOf = useCallback(
    (roleId: string, module: ModuleKey): AccessLevel =>
      permOverrides[roleId]?.[module] ?? serverPermissions[roleId]?.[module] ?? "NONE",
    [permOverrides, serverPermissions]
  );

  const isLevelChanged = useCallback((roleId: string, module: ModuleKey) => permOverrides[roleId]?.[module] !== undefined, [permOverrides]);

  const setLevel = useCallback(
    (roleId: string, module: ModuleKey, level: AccessLevel) => {
      setPermOverrides((prev) => {
        const nextRole = { ...prev[roleId] };
        if (serverPermissions[roleId]?.[module] === level) delete nextRole[module];
        else nextRole[module] = level;
        const next = { ...prev };
        if (Object.keys(nextRole).length === 0) delete next[roleId];
        else next[roleId] = nextRole;
        return next;
      });
    },
    [serverPermissions]
  );

  const serverRulesFor = useCallback(
    (key: string): NotificationRules | undefined =>
      key === OWNER_KEY ? data?.owner?.notifications : roles.find((r) => r.id === key)?.notifications,
    [data, roles]
  );

  const columnOf = useCallback(
    (key: string): RoleColumnKey => (key === OWNER_KEY ? "OWNER" : roles.find((r) => r.id === key)?.key ?? "STAFF"),
    [roles]
  );

  const notificationOf = useCallback(
    (key: string, type: NotificationTypeKey): boolean =>
      notifOverrides[key]?.[type] ?? resolveNotification(serverRulesFor(key), type, columnOf(key)),
    [notifOverrides, serverRulesFor, columnOf]
  );

  const isNotificationChanged = useCallback((key: string, type: NotificationTypeKey) => notifOverrides[key]?.[type] !== undefined, [notifOverrides]);

  const setNotification = useCallback(
    (key: string, type: NotificationTypeKey, enabled: boolean) => {
      const serverValue = resolveNotification(serverRulesFor(key), type, columnOf(key));
      setNotifOverrides((prev) => {
        const nextRules = { ...prev[key] };
        if (serverValue === enabled) delete nextRules[type];
        else nextRules[type] = enabled;
        const next = { ...prev };
        if (Object.keys(nextRules).length === 0) delete next[key];
        else next[key] = nextRules;
        return next;
      });
    },
    [serverRulesFor, columnOf]
  );

  const countOf = (overrides: Record<string, object>) => Object.values(overrides).reduce((sum, o) => sum + Object.keys(o).length, 0);
  const permissionChanges = countOf(permOverrides);
  const notificationChanges = countOf(notifOverrides);
  const changeCount = permissionChanges + notificationChanges;

  const discard = useCallback(() => {
    setPermOverrides({});
    setNotifOverrides({});
  }, []);

  const save = useCallback(async () => {
    if (!data || isSaving) return;
    const requests: { label: string; keys: { perm?: string; notif?: string }; run: () => Promise<{ ok: boolean; error?: string }> }[] = [];

    const roleIds = new Set([...Object.keys(permOverrides), ...Object.keys(notifOverrides).filter((k) => k !== OWNER_KEY)]);
    for (const roleId of roleIds) {
      const role: AccessRole | undefined = roles.find((r) => r.id === roleId);
      if (!role) continue;
      const body: UpdateRoleInput = {};
      if (permOverrides[roleId]) body.permissions = { ...serverPermissions[roleId], ...permOverrides[roleId] } as PermissionMap;
      if (notifOverrides[roleId]) body.notifications = fullNotifications(role.notifications, role.key, notifOverrides[roleId]);
      requests.push({
        label: role.name,
        keys: { perm: permOverrides[roleId] ? roleId : undefined, notif: notifOverrides[roleId] ? roleId : undefined },
        run: () => putJson(`/api/roles/${role.id}`, body),
      });
    }
    if (notifOverrides[OWNER_KEY]) {
      requests.push({
        label: "Owner",
        keys: { notif: OWNER_KEY },
        run: () => putJson("/api/roles/owner", { notifications: fullNotifications(data.owner?.notifications, "OWNER", notifOverrides[OWNER_KEY]) }),
      });
    }
    if (requests.length === 0) return;

    setIsSaving(true);
    const results = await Promise.all(requests.map((r) => r.run()));
    const failed = requests.filter((_, i) => !results[i].ok);
    const saved = requests.filter((_, i) => results[i].ok);

    await refresh();
    // Keep the drafts of failed saves so they can be retried.
    setPermOverrides((prev) => {
      const next = { ...prev };
      for (const r of saved) if (r.keys.perm) delete next[r.keys.perm];
      return next;
    });
    setNotifOverrides((prev) => {
      const next = { ...prev };
      for (const r of saved) if (r.keys.notif) delete next[r.keys.notif];
      return next;
    });
    setIsSaving(false);

    if (saved.length > 0) toast.success(`Saved changes for ${saved.map((r) => r.label).join(", ")}`);
    for (const [i, r] of requests.entries()) {
      if (!results[i].ok) toast.error(`Couldn't save ${r.label}: ${results[i].error || "please try again"}`);
    }
    return failed.length === 0;
  }, [data, isSaving, permOverrides, notifOverrides, roles, serverPermissions, refresh]);

  return {
    roles,
    modules: ACCESS_MODULES,
    levelOf,
    isLevelChanged,
    setLevel,
    notificationOf,
    isNotificationChanged,
    setNotification,
    permissionChanges,
    notificationChanges,
    changeCount,
    isSaving,
    discard,
    save,
  };
}

export type RolesDraft = ReturnType<typeof useRolesDraft>;
