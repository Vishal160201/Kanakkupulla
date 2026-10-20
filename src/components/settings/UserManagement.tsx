"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { SHOPS_KEY, useShops } from "@/components/providers/ShopProvider";
import { Tooltip } from "@/components/ui/Tooltip";
import type { RolesResponse, TeamMember } from "@/types/settings";
import InviteUserModal from "./InviteUserModal";
import EditUserModal from "./EditUserModal";
import DeleteUserModal from "./DeleteUserModal";
import ToggleStatusModal from "./ToggleStatusModal";
import OwnersOnlyState from "./common/OwnersOnlyState";
import { useIsOwner } from "./common/useIsOwner";
import AssignmentChips from "./users/AssignmentChips";
import { STATUS_LABELS, STATUS_STYLES, avatarColorOf, initialsOf, isPrimaryOwner, readError, userIdLabel } from "./users/userHelpers";

const USERS_KEY = "/api/users";
const ROLES_KEY = "/api/roles";

/** Shop member lists and role assignment counts depend on the team. */
const revalidateAccessViews = () => Promise.all([globalMutate(USERS_KEY), globalMutate(SHOPS_KEY), globalMutate(ROLES_KEY)]);

interface UserRowProps {
  user: TeamMember;
  isCurrentUser: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  shops: ReturnType<typeof useShops>["allShops"];
  roles: RolesResponse["roles"];
}

function UserRow({ user, isCurrentUser, onEdit, onToggleStatus, shops, roles }: UserRowProps) {
  const statusStyle = STATUS_STYLES[user.status] ?? STATUS_STYLES.ACTIVE;
  // The primary owner account can only be edited by itself.
  const isEditable = isCurrentUser || !isPrimaryOwner(user);
  const isActive = user.status !== "INACTIVE";

  return (
    <Tooltip content={isEditable ? undefined : "Only the primary owner can edit this account"}>
      <div
        role={isEditable ? "button" : undefined}
        tabIndex={isEditable ? 0 : undefined}
        aria-label={isEditable ? `Edit ${user.name || user.email || "user"}` : undefined}
        onClick={() => {
          if (!isEditable) {
            toast.error("The primary owner's account can only be edited by them.");
            return;
          }
          onEdit();
        }}
        onKeyDown={(e) => {
          if (isEditable && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
            e.preventDefault();
            onEdit();
          }
        }}
        className={`px-4 py-3 flex items-start sm:items-center gap-3 transition-all group rounded-2xl border outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
          isEditable ? "cursor-pointer hover:-translate-y-[1px] hover:shadow-md" : "cursor-default"
        } ${isCurrentUser ? "bg-[#fcfaff] border-purple-100 shadow-sm hover:border-purple-200" : `bg-white border-slate-100 shadow-sm ${isEditable ? "hover:border-orange-100" : ""}`}`}
      >
        <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 relative ${avatarColorOf(user.name)}`}>
          {initialsOf(user.name, user.email)}
          {user.role === "OWNER" && (
            <i aria-hidden="true" className="ph-fill ph-crown absolute -top-1 -left-1 text-orange-400 text-[0.65rem] bg-white rounded-full p-0.5 shadow-sm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm text-slate-900 truncate tracking-tight">{user.name || "Unnamed user"}</span>
            {isCurrentUser && (
              <span className="text-[0.55rem] font-bold text-purple-600 bg-purple-100 px-1.5 py-[0.1rem] rounded border border-purple-200">YOU</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {user.email && <span className="text-[0.7rem] text-slate-500 truncate max-w-full">{user.email}</span>}
            <span className="text-[0.65rem] font-mono text-slate-400 whitespace-nowrap">{userIdLabel(user)}</span>
          </div>
          <div className="mt-1.5">
            <AssignmentChips user={user} shops={shops} roles={roles} />
          </div>
          {user.tempPassword && (
            <div className="mt-1.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-[0.55rem] font-bold text-slate-400 uppercase tracking-wider">Reset code:</span>
              <div className="flex items-center gap-1 bg-orange-50 border border-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[0.65rem] font-mono font-bold">
                {user.tempPassword}
                <Tooltip content="Copy code">
                  <button
                    type="button"
                    aria-label="Copy reset code"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(user.tempPassword!);
                      toast.success("Code copied");
                    }}
                    className="text-orange-400 hover:text-orange-600 transition-colors"
                  >
                    <i aria-hidden="true" className="ph ph-copy text-[0.65rem]" />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 text-[0.7rem] font-semibold px-2.5 py-1 rounded-full border ${statusStyle.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            <span className={statusStyle.text}>{STATUS_LABELS[user.status]}</span>
          </div>
          {!isCurrentUser && isEditable ? (
            <Tooltip content={isActive ? "Deactivate" : "Reactivate"}>
              <button
                type="button"
                aria-label={`${isActive ? "Deactivate" : "Reactivate"} ${user.name || user.email || "user"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus();
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors ${
                  isActive ? "hover:text-amber-600 hover:bg-amber-50" : "hover:text-green-600 hover:bg-green-50"
                }`}
              >
                <i aria-hidden="true" className={`ph-bold ${isActive ? "ph-pause-circle" : "ph-play-circle"} text-lg`} />
              </button>
            </Tooltip>
          ) : (
            // Same footprint as the status button so status pills line up across rows
            <span aria-hidden="true" className="hidden sm:block w-8 h-8 shrink-0" />
          )}
          <i aria-hidden="true" className="hidden sm:block ph ph-caret-right text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Tooltip>
  );
}

function TeamList() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { data: usersData, error: usersError, isLoading: usersLoading, mutate: mutateUsers } = useSWR<TeamMember[]>(USERS_KEY, fetcher);
  const { data: rolesData, error: rolesError, isLoading: rolesLoading } = useSWR<RolesResponse>(ROLES_KEY, fetcher, { revalidateOnFocus: false });
  const { allShops, isLoading: shopsLoading } = useShops();

  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [statusTarget, setStatusTarget] = useState<TeamMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  const users = Array.isArray(usersData) ? usersData : [];
  const roles = rolesData?.roles ?? [];
  const owners = users.filter((u) => u.role === "OWNER");
  const members = users.filter((u) => u.role !== "OWNER");
  const optionsLoading = rolesLoading || (shopsLoading && allShops.length === 0);
  const optionsError = !!rolesError;

  const updateStatus = async (user: TeamMember) => {
    const nextStatus = user.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        toast.error((await readError(res, "Failed to update status")).message);
        return;
      }
      toast.success(nextStatus === "ACTIVE" ? `${user.name || "User"} reactivated` : `${user.name || "User"} deactivated`);
      setStatusTarget(null);
      await mutateUsers();
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  const deleteUser = async (user: TeamMember) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error((await readError(res, "Failed to remove user")).message);
        return;
      }
      toast.success(`${user.name || "User"} removed`);
      setDeleteTarget(null);
      await revalidateAccessViews();
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  const renderGroup = (title: string, icon: string, list: TeamMember[]) =>
    list.length > 0 && (
      <section className="space-y-2.5">
        <h3 className="flex items-center gap-1.5 px-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          <i aria-hidden="true" className={`ph-bold ${icon}`} />
          {title} <span className="text-slate-300">({list.length})</span>
        </h3>
        {list.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isCurrentUser={user.id === currentUserId}
            shops={allShops}
            roles={roles}
            onEdit={() => setEditTarget(user)}
            onToggleStatus={() => setStatusTarget(user)}
          />
        ))}
      </section>
    );

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-[1.6rem] font-extrabold text-slate-900 tracking-tight">Users &amp; Team</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Owners can do everything. Everyone else gets Admin or Staff access per shop.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md active:scale-[0.97] shrink-0"
          >
            <i aria-hidden="true" className="ph-fill ph-user-plus text-base" />
            Invite user
          </button>
        </div>

        {usersLoading && users.length === 0 ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[84px] rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : usersError ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
            <p className="text-sm font-bold text-rose-700">Couldn&apos;t load the team</p>
            <button
              type="button"
              onClick={() => mutateUsers()}
              className="mt-3 h-9 px-4 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-7 py-12 text-center text-slate-400">
            <i aria-hidden="true" className="ph ph-users-three text-4xl mb-3 block" />
            <p className="font-bold text-slate-500">No team members yet</p>
            <p className="text-sm mt-1">Invite your first team member to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {renderGroup("Owners", "ph-crown", owners)}
            {renderGroup("Team", "ph-users-three", members)}
          </div>
        )}
      </div>

      {showInvite && (
        <InviteUserModal
          shops={allShops}
          roles={roles}
          isLoadingOptions={optionsLoading}
          optionsError={optionsError}
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            setShowInvite(false);
            revalidateAccessViews();
          }}
        />
      )}

      {editTarget && (
        <EditUserModal
          key={editTarget.id}
          user={editTarget}
          isCurrentUser={editTarget.id === currentUserId}
          ownerCount={owners.length}
          shops={allShops}
          roles={roles}
          isLoadingOptions={optionsLoading}
          optionsError={optionsError}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            revalidateAccessViews();
          }}
          onRequestToggleStatus={(user) => {
            setEditTarget(null);
            setStatusTarget(user);
          }}
          onRequestDelete={(user) => {
            setEditTarget(null);
            setDeleteTarget(user);
          }}
        />
      )}

      {statusTarget && <ToggleStatusModal user={statusTarget} onClose={() => setStatusTarget(null)} onConfirm={() => updateStatus(statusTarget)} />}
      {deleteTarget && <DeleteUserModal user={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteUser(deleteTarget)} />}
    </>
  );
}

/** Settings → Users & Team (owners only). */
export default function UserManagement() {
  const { isOwner, isLoading } = useIsOwner();
  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[84px] rounded-2xl bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!isOwner) return <OwnersOnlyState title="Only owners can manage the team" />;
  return <TeamList />;
}
