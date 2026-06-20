"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import InviteUserModal from "./InviteUserModal";
import DeleteUserModal from "./DeleteUserModal";
import ToggleStatusModal from "./ToggleStatusModal";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "STAFF" | "PHOTOGRAPHER";
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  invitedAt: string | null;
  tempPassword?: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Studio Admin",
  STAFF: "Staff",
  PHOTOGRAPHER: "Photographer",
};

const ROLE_BADGES: Record<string, { bg: string; text: string; icon: string }> = {
  ADMIN: { bg: "bg-orange-50", text: "text-orange-600", icon: "ph-shield-check" },
  STAFF: { bg: "bg-[#eff6ff]", text: "text-blue-600", icon: "ph-users" },
  PHOTOGRAPHER: { bg: "bg-green-50", text: "text-green-600", icon: "ph-camera" },
};

const AVATAR_COLORS = [
  "bg-[#1e293b]", // slate-800
  "bg-[#0369a1]", // sky-700
  "bg-[#15803d]", // green-700
  "bg-[#c2410c]", // orange-700
  "bg-[#6d28d9]", // violet-700
];

const getAvatarColor = (name: string | null) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  ACTIVE: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50 border-green-200" },
  PENDING: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  INACTIVE: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

export default function UserManagement() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<User | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const currentUserId = (session?.user as any)?.id;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }
      toast.success("Role updated successfully");
      setEditingRoleId(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      toast.success(`User ${newStatus === "ACTIVE" ? "enabled" : "disabled"} successfully`);
      setToggleStatusTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      toast.success("User deleted successfully");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
        <div className="flex items-center justify-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin"></div>
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[1.75rem] font-bold text-slate-900 tracking-tight">Studio Access</h2>
            <p className="text-slate-500 text-sm mt-1">
              Control who has access to your studio's financial and settings.
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
          >
            <i className="ph-fill ph-user-plus text-base"></i>
            Invite User
          </button>
        </div>

        {/* User List */}
        <div className="flex flex-col gap-2.5">
          {users.length === 0 ? (
            <div className="px-7 py-12 text-center text-slate-400">
              <i className="ph ph-users-three text-4xl mb-3 block"></i>
              <p className="font-medium">No team members yet</p>
              <p className="text-sm mt-1">Invite your first team member to get started.</p>
            </div>
          ) : (
            users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const statusStyle = STATUS_STYLES[user.status] || STATUS_STYLES.ACTIVE;

              return (
                <div
                  key={user.id}
                  className={`px-4 py-2.5 flex items-center gap-3 transition-colors group rounded-xl border ${
                    isCurrentUser ? "bg-[#fcfaff] border-purple-100 shadow-sm" : "bg-white border-gray-100 shadow-sm"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 relative ${getAvatarColor(user.name)}`}>
                    {getInitials(user.name)}
                    {user.role === "ADMIN" && (
                      <i className="ph-fill ph-crown absolute -top-1 -left-1 text-orange-400 text-[0.65rem] bg-white rounded-full p-0.5 shadow-sm"></i>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-[0.85rem] text-slate-900 truncate tracking-tight">
                        {user.name || "Unnamed User"}
                      </span>
                      {ROLE_BADGES[user.role] && (
                        <div className={`flex items-center gap-1 px-1.5 py-[0.1rem] rounded text-[0.55rem] font-bold uppercase tracking-wide w-fit ${ROLE_BADGES[user.role].bg} ${ROLE_BADGES[user.role].text}`}>
                          <i className={`ph ${ROLE_BADGES[user.role].icon} text-xs`}></i>
                          {ROLE_LABELS[user.role] || user.role}
                        </div>
                      )}
                      {isCurrentUser && (
                        <span className="text-[0.55rem] font-bold text-purple-600 bg-purple-100 px-1.5 py-[0.1rem] rounded border border-purple-200">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      {user.email && (
                        <span className="text-[0.7rem] text-slate-500">
                          {user.email}
                        </span>
                      )}
                    </div>
                    {user.tempPassword && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-wider">Reset Code:</span>
                        <div className="flex items-center gap-1 bg-orange-50 border border-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[0.65rem] font-mono font-bold">
                          {user.tempPassword}
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(user.tempPassword!);
                              toast.success("Code copied!");
                            }}
                            className="text-orange-400 hover:text-orange-600 transition-colors"
                            title="Copy code"
                          >
                            <i className="ph ph-copy text-[0.65rem]"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <button 
                    onClick={() => !isCurrentUser && setToggleStatusTarget(user)}
                    disabled={isCurrentUser}
                    className={`flex items-center gap-1.5 text-[0.75rem] font-semibold px-3 py-1 rounded-full border transition-all ${statusStyle.bg} ${!isCurrentUser ? 'cursor-pointer hover:shadow-sm hover:-translate-y-[1px]' : 'cursor-default opacity-80'}`}
                    title={!isCurrentUser ? "Click to toggle status" : "Cannot change your own status"}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                    <span className={statusStyle.text}>{user.status}</span>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 w-[72px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isCurrentUser && (
                      <>
                        {/* Role Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setEditingRoleId(editingRoleId === user.id ? null : user.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Change role"
                        >
                          <i className="ph ph-pencil-simple text-base"></i>
                        </button>
                        {editingRoleId === user.id && (
                          <div className="absolute top-full right-0 mt-1 w-[180px] bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 py-1.5 z-50">
                            {Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => (
                              <button
                                key={roleKey}
                                onClick={() => handleRoleChange(user.id, roleKey)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${
                                  user.role === roleKey ? "font-bold text-orange-600" : "text-slate-700"
                                }`}
                              >
                                {roleLabel}
                                {user.role === roleKey && <i className="ph-fill ph-check text-orange-500"></i>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove user"
                      >
                        <i className="ph ph-trash text-base"></i>
                      </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            fetchUsers();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDeleteUser(deleteTarget.id)}
        />
      )}

      {toggleStatusTarget && (
        <ToggleStatusModal
          user={toggleStatusTarget}
          onClose={() => setToggleStatusTarget(null)}
          onConfirm={() => handleToggleStatus(toggleStatusTarget)}
        />
      )}
    </>
  );
}
