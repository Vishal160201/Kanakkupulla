"use client";

import type { FormField, UserOption, UserPicklistConfig } from "@/types/settings";

interface UserPicklistConfigEditorProps {
  field: FormField;
  update: (updates: Partial<FormField>) => void;
  allUsers: UserOption[];
}

const PICKLIST_ROLES = ["ADMIN", "STAFF", "PHOTOGRAPHER"];

/** USER_PICKLIST / MULTI_USER_PICKLIST: which users appear in the pick-list. */
export default function UserPicklistConfigEditor({ field, update, allUsers }: UserPicklistConfigEditorProps) {
  const config = field.userPicklistConfig;
  const setConfig = (userPicklistConfig: UserPicklistConfig) => update({ userPicklistConfig });

  return (
    <div className="pt-4 border-t border-gray-100">
      <label className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1 mb-3">
        User Pick List Values
      </label>
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="upConfigMode" className="accent-orange-500 w-4 h-4" checked={!config || config.mode === "ALL"} onChange={() => setConfig({ mode: "ALL", roles: [], userIds: [] })} />
          <span className="text-sm font-semibold text-slate-700">All Users</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="upConfigMode" className="accent-orange-500 w-4 h-4" checked={config?.mode === "ROLES"} onChange={() => setConfig({ mode: "ROLES", roles: config?.roles || [], userIds: [] })} />
          <span className="text-sm font-semibold text-slate-700">Select Roles</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="upConfigMode" className="accent-orange-500 w-4 h-4" checked={config?.mode === "USERS"} onChange={() => setConfig({ mode: "USERS", roles: [], userIds: config?.userIds || [] })} />
          <span className="text-sm font-semibold text-slate-700">Select Users</span>
        </label>
      </div>

      <div className="flex items-center justify-between py-3 border-y border-gray-100 mb-4">
        <span className="text-[0.8rem] font-bold text-slate-700">Show User Availability</span>
        <button
          type="button"
          role="switch"
          aria-checked={!!config?.showAvailability}
          aria-label="Show user availability"
          onClick={() => {
            const currentConfig: UserPicklistConfig = config || { mode: "ALL", roles: [], userIds: [] };
            setConfig({
              ...currentConfig,
              showAvailability: !currentConfig.showAvailability,
            });
          }}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer ${config?.showAvailability ? "bg-orange-500" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${config?.showAvailability ? "translate-x-5" : "translate-x-0"}`}></span>
        </button>
      </div>

      {(!config || config.mode === "ALL") && (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-semibold text-slate-500 text-center">
          The pick-list will include all project users.
        </div>
      )}

      {config?.mode === "ROLES" && (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          {PICKLIST_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-orange-500 w-4 h-4 rounded"
                checked={config.roles?.includes(role) || false}
                onChange={(e) => {
                  const currentRoles = config.roles || [];
                  const newRoles = e.target.checked ? [...currentRoles, role] : currentRoles.filter((r) => r !== role);
                  setConfig({ ...config, roles: newRoles });
                }}
              />
              <span className="text-sm font-semibold text-slate-700">{role}</span>
            </label>
          ))}
        </div>
      )}

      {config?.mode === "USERS" && (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 max-h-[200px] overflow-y-auto flex flex-col gap-3">
          {allUsers.length === 0 && <span className="text-sm text-slate-400">Loading users...</span>}
          {allUsers.map((user) => (
            <label key={user.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-orange-500 w-4 h-4 rounded"
                checked={config.userIds?.includes(user.id) || false}
                onChange={(e) => {
                  const currentUserIds = config.userIds || [];
                  const newUserIds = e.target.checked ? [...currentUserIds, user.id] : currentUserIds.filter((id) => id !== user.id);
                  setConfig({ ...config, userIds: newUserIds });
                }}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                <span className="text-[0.6rem] font-bold text-slate-400 uppercase">{user.role}</span>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
