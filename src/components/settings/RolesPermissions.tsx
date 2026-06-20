"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface RolePermission {
  id: string;
  role: string;
  permission: string;
  enabled: boolean;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  manage_bookings: { label: "Manage Bookings", description: "Create, edit, and delete bookings", icon: "ph-calendar-blank" },
  view_transactions: { label: "View Transactions", description: "View financial transaction history", icon: "ph-eye" },
  manage_transactions: { label: "Manage Transactions", description: "Create, edit, and delete transactions", icon: "ph-file-text" },
  view_analytics: { label: "View Analytics", description: "Access analytics and reports", icon: "ph-chart-bar" },
  manage_users: { label: "Manage Users", description: "Invite, edit, and remove team members", icon: "ph-users-three" },
  view_galleries: { label: "View Galleries", description: "View client photo galleries", icon: "ph-images" },
  manage_galleries: { label: "Manage Galleries", description: "Upload and manage gallery content", icon: "ph-image" },
};

const ROLES = ["ADMIN", "STAFF", "PHOTOGRAPHER"] as const;

const ROLE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Admin", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  STAFF: { label: "Staff", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  PHOTOGRAPHER: { label: "Photographer", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};

export default function RolesPermissions() {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/permissions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPermissions(data);
    } catch {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isEnabled = (role: string, permission: string): boolean => {
    const perm = permissions.find((p) => p.role === role && p.permission === permission);
    return perm?.enabled ?? false;
  };

  const handleToggle = async (role: string, permission: string) => {
    if (role === "ADMIN") return; // ADMIN is locked

    const key = `${role}-${permission}`;
    const currentValue = isEnabled(role, permission);

    // Optimistic update
    setPermissions((prev) =>
      prev.map((p) =>
        p.role === role && p.permission === permission ? { ...p, enabled: !currentValue } : p
      )
    );

    setUpdatingKeys((prev) => new Set(prev).add(key));

    try {
      const res = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permission, enabled: !currentValue }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }
    } catch {
      // Revert on failure
      setPermissions((prev) =>
        prev.map((p) =>
          p.role === role && p.permission === permission ? { ...p, enabled: currentValue } : p
        )
      );
      toast.error("Failed to update permission");
    } finally {
      setUpdatingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
        <div className="flex items-center justify-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin"></div>
          Loading permissions...
        </div>
      </div>
    );
  }

  const permissionKeys = Object.keys(PERMISSION_LABELS);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-7 py-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-slate-900">Roles & Permissions</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Configure what each role can access. Admin permissions are locked and always enabled.
        </p>
      </div>

      {/* Permission Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-7 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-[280px]">
                Permission
              </th>
              {ROLES.map((role) => {
                const display = ROLE_DISPLAY[role];
                return (
                  <th key={role} className="px-4 py-4 text-center w-[140px]">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${display.bg} ${display.color}`}>
                      {role === "ADMIN" && <i className="ph-fill ph-crown text-[0.65rem]"></i>}
                      {display.label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {permissionKeys.map((permKey) => {
              const perm = PERMISSION_LABELS[permKey];
              return (
                <tr key={permKey} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-7 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <i className={`ph-fill ${perm.icon} text-slate-500 text-sm`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{perm.label}</p>
                        <p className="text-[0.7rem] text-slate-400">{perm.description}</p>
                      </div>
                    </div>
                  </td>
                  {ROLES.map((role) => {
                    const enabled = isEnabled(role, permKey);
                    const isAdmin = role === "ADMIN";
                    const key = `${role}-${permKey}`;
                    const isUpdating = updatingKeys.has(key);

                    return (
                      <td key={role} className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggle(role, permKey)}
                          disabled={isAdmin || isUpdating}
                          className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                            isAdmin
                              ? "cursor-not-allowed opacity-70"
                              : "cursor-pointer hover:shadow-md"
                          } ${
                            enabled
                              ? isAdmin
                                ? "bg-orange-400"
                                : "bg-green-500 shadow-sm"
                              : "bg-slate-200"
                          }`}
                          title={isAdmin ? "Admin permissions are locked" : `Toggle ${perm.label}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                              enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          >
                            {isAdmin && enabled && (
                              <i className="ph-fill ph-lock-simple text-[0.5rem] text-orange-400"></i>
                            )}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="px-7 py-4 bg-slate-50 border-t border-gray-100">
        <div className="flex items-center gap-2 text-[0.75rem] text-slate-400">
          <i className="ph ph-info text-sm"></i>
          <span>Changes are saved automatically. Admin role permissions cannot be modified.</span>
        </div>
      </div>
    </div>
  );
}
