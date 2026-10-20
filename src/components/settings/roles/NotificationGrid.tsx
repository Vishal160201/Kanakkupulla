"use client";

import { NOTIFICATION_TYPES, type NotificationTypeKey } from "@/lib/access";
import type { AccessRole } from "@/types/settings";
import Switch from "../common/Switch";
import { ROLE_META, type RoleColumnKey } from "./roleMeta";
import { OWNER_KEY, type RolesDraft } from "./useRolesDraft";

interface NotificationGridProps {
  roles: AccessRole[];
  draft: RolesDraft;
}

/** Icon per alert family, picked from the type name. */
const iconFor = (type: NotificationTypeKey): string => {
  if (type.startsWith("PAYMENT") || type === "ADVANCE_NOT_COLLECTED") return "currency-inr";
  if (type.startsWith("ORDER")) return "gift";
  if (type.startsWith("GALLERY") || type.startsWith("ALBUM")) return "images";
  if (type === "HOT_DATE_ALERT") return "fire";
  return "calendar-blank";
};

interface Column {
  key: string;
  role: RoleColumnKey;
  label: string;
}

/** Which roles receive which alerts: alert types x Owner / Admin / Staff switches. */
export default function NotificationGrid({ roles, draft }: NotificationGridProps) {
  const columns: Column[] = [
    { key: OWNER_KEY, role: "OWNER", label: "Owner" },
    ...roles.map((r) => ({ key: r.id, role: r.key, label: r.name })),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th scope="col" className="text-left px-4 sm:px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Alert
            </th>
            {columns.map((col) => (
              <th key={col.key} scope="col" className="px-1.5 sm:px-3 py-3 text-center w-[64px] sm:w-[120px]">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold border ${ROLE_META[col.role].badge}`}>
                  <i aria-hidden="true" className={`ph-bold ph-${ROLE_META[col.role].icon} hidden sm:inline`} />
                  {col.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {NOTIFICATION_TYPES.map(({ type, label }) => (
            <tr key={type} className="hover:bg-slate-50/40 transition-colors">
              <th scope="row" className="px-4 sm:px-5 py-3 text-left font-normal">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="hidden sm:flex w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 items-center justify-center">
                    <i aria-hidden="true" className={`ph-bold ph-${iconFor(type)} text-sm`} />
                  </span>
                  <span className="text-[13px] sm:text-sm font-bold text-slate-800 leading-snug">{label}</span>
                </span>
              </th>
              {columns.map((col) => {
                const changed = draft.isNotificationChanged(col.key, type);
                return (
                  <td key={col.key} className="px-1.5 sm:px-3 py-3 text-center">
                    <span className="relative inline-flex align-middle">
                      <Switch
                        size="sm"
                        checked={draft.notificationOf(col.key, type)}
                        onChange={(next) => draft.setNotification(col.key, type, next)}
                        label={`${col.label}: ${label}`}
                        disabled={draft.isSaving}
                      />
                      {changed && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white">
                          <span className="sr-only">Unsaved change</span>
                        </span>
                      )}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
