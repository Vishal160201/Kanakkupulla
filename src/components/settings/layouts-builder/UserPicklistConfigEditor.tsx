"use client";

import type { FormField, UserOption, UserPicklistConfig, UserRole } from "@/types/settings";
import Switch from "../common/Switch";

interface UserPicklistConfigEditorProps {
  field: FormField;
  update: (updates: Partial<FormField>) => void;
  allUsers: UserOption[];
}

/** Studio-level roles a pick-list can be limited to (shop roles aren't visible to every user). */
const PICKLIST_ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: "OWNER", label: "Owners", hint: "Full access to everything" },
  { value: "MEMBER", label: "Members", hint: "Admin or Staff in one or more shops" },
];

/** Layouts saved before Owner / Member existed used the old studio roles. */
const LEGACY_ROLE_MAP: Record<string, UserRole> = { ADMIN: "OWNER", STAFF: "MEMBER", PHOTOGRAPHER: "MEMBER" };
const normalizeRoles = (roles: string[] | undefined): UserRole[] =>
  [...new Set((roles ?? []).map((r) => LEGACY_ROLE_MAP[r] ?? r).filter((r): r is UserRole => r === "OWNER" || r === "MEMBER"))];

const MODES: { value: UserPicklistConfig["mode"]; label: string }[] = [
  { value: "ALL", label: "All users" },
  { value: "ROLES", label: "Select roles" },
  { value: "USERS", label: "Select users" },
];

function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-lg px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
    >
      <span
        aria-hidden="true"
        className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
          checked ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white"
        }`}
      >
        {checked && <i className="ph-bold ph-check text-[10px]" />}
      </span>
      {children}
    </button>
  );
}

/** USER_PICKLIST / MULTI_USER_PICKLIST: which users appear in the pick-list. */
export default function UserPicklistConfigEditor({ field, update, allUsers }: UserPicklistConfigEditorProps) {
  const config = field.userPicklistConfig;
  const mode = config?.mode ?? "ALL";
  const setConfig = (userPicklistConfig: UserPicklistConfig) => update({ userPicklistConfig });
  const selectedRoles = normalizeRoles(config?.roles);

  const setMode = (next: UserPicklistConfig["mode"]) => {
    const showAvailability = config?.showAvailability;
    if (next === "ALL") setConfig({ mode: "ALL", roles: [], userIds: [], showAvailability });
    else if (next === "ROLES") setConfig({ mode: "ROLES", roles: selectedRoles, userIds: [], showAvailability });
    else setConfig({ mode: "USERS", roles: [], userIds: config?.userIds || [], showAvailability });
  };

  return (
    <div className="pt-4 border-t border-gray-100">
      <span className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1 mb-3">User Pick List Values</span>
      <div role="radiogroup" aria-label="Which users to list" className="flex w-full rounded-xl bg-slate-100 p-0.5 mb-4">
        {MODES.map((m) => {
          const isActive = m.value === mode;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setMode(m.value)}
              className={`flex-1 h-8 px-2 rounded-[10px] text-[11px] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
                isActive ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between py-3 border-y border-gray-100 mb-4">
        <span className="text-[0.8rem] font-bold text-slate-700">Show User Availability</span>
        <Switch
          size="sm"
          checked={!!config?.showAvailability}
          label="Show user availability"
          onChange={(next) => {
            const currentConfig: UserPicklistConfig = config || { mode: "ALL", roles: [], userIds: [] };
            setConfig({ ...currentConfig, showAvailability: next });
          }}
        />
      </div>

      {mode === "ALL" && (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-semibold text-slate-500 text-center">
          The pick-list will include all project users.
        </div>
      )}

      {mode === "ROLES" && config && (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          {PICKLIST_ROLES.map((role) => {
            const checked = selectedRoles.includes(role.value);
            return (
              <CheckRow
                key={role.value}
                checked={checked}
                onToggle={() =>
                  setConfig({ ...config, roles: checked ? selectedRoles.filter((r) => r !== role.value) : [...selectedRoles, role.value] })
                }
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700">{role.label}</span>
                  <span className="text-[0.65rem] font-semibold text-slate-400">{role.hint}</span>
                </span>
              </CheckRow>
            );
          })}
        </div>
      )}

      {mode === "USERS" && config && (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 max-h-[200px] overflow-y-auto flex flex-col gap-3">
          {allUsers.length === 0 && <span className="text-sm text-slate-400">Loading users...</span>}
          {allUsers.map((user) => {
            const checked = config.userIds?.includes(user.id) || false;
            return (
              <CheckRow
                key={user.id}
                checked={checked}
                onToggle={() => {
                  const current = config.userIds || [];
                  setConfig({ ...config, userIds: checked ? current.filter((id) => id !== user.id) : [...current, user.id] });
                }}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                  <span className="text-[0.6rem] font-bold text-slate-400 uppercase">{user.role === "OWNER" ? "Owner" : "Member"}</span>
                </span>
              </CheckRow>
            );
          })}
        </div>
      )}
    </div>
  );
}
