"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import ShopIcon from "@/components/shops/ShopIcon";
import type { Shop, ShopMembersResponse } from "@/types/shops";
import type { RolesResponse, TeamMember } from "@/types/settings";
import { ROLE_META, pluralize } from "../roles/roleMeta";
import { STATUS_LABELS, avatarColorOf, initialsOf } from "../users/userHelpers";

interface ShopMembersDialogProps {
  shop: Shop;
  onClose: () => void;
  /** Called after the people were saved (refresh the shop list). */
  onSaved: () => Promise<unknown> | void;
}

/** userId -> roleId; missing = no access. */
type Draft = Record<string, string>;

const toDraft = (shop: Shop): Draft => Object.fromEntries((shop.members ?? []).map((m) => [m.userId, m.roleId]));

function Avatar({ user }: { user: TeamMember }) {
  return (
    <span
      aria-hidden="true"
      className={`relative w-9 h-9 shrink-0 rounded-full text-white text-xs font-extrabold flex items-center justify-center ${avatarColorOf(user.name)}`}
    >
      {initialsOf(user.name, user.email)}
      {user.role === "OWNER" && (
        <i className="ph-fill ph-crown absolute -top-1 -left-1 text-orange-400 text-[0.6rem] bg-white rounded-full p-0.5 shadow-sm" />
      )}
    </span>
  );
}

/**
 * Settings → Shops → People: who can open a shop and with which role (Admin / Staff).
 * Works for every shop type. Owners always have access. Mounted only while open.
 */
export default function ShopMembersDialog({ shop, onClose, onSaved }: ShopMembersDialogProps) {
  const { data: users, error: usersError, isLoading: usersLoading } = useSWR<TeamMember[]>("/api/users", fetcher);
  const { data: rolesData, error: rolesError, isLoading: rolesLoading } = useSWR<RolesResponse>("/api/roles", fetcher, { revalidateOnFocus: false });
  const [draft, setDraft] = useState<Draft>(() => toDraft(shop));
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = usersLoading || rolesLoading;
  const error = usersError || rolesError;
  const roles = rolesData?.roles ?? [];
  const list = Array.isArray(users) ? users : [];
  const owners = list.filter((u) => u.role === "OWNER");
  // Active members, plus anyone already assigned (e.g. since deactivated) so they can be removed.
  const candidates = list.filter((u) => u.role !== "OWNER" && (u.status === "ACTIVE" || !!toDraft(shop)[u.id]));

  const options: DropdownOption[] = [
    { label: "No access", value: "", icon: "prohibit" },
    ...roles.map((r) => ({ label: r.name, value: r.id, icon: ROLE_META[r.key]?.icon ?? "user" })),
  ];
  const assigned = candidates.filter((u) => draft[u.id]).length;

  const save = async () => {
    setIsSaving(true);
    try {
      const members = Object.entries(draft)
        .filter(([userId, roleId]) => roleId && candidates.some((u) => u.id === userId))
        .map(([userId, roleId]) => ({ userId, roleId }));
      const res = await fetch(`/api/shops/${shop.id}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });
      const data: Partial<ShopMembersResponse> & { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to save who can open this shop.");
        return;
      }
      const count = data.members?.length ?? members.length;
      toast.success(`${shop.name}: ${count === 0 ? "owners only" : `${pluralize(count, "person", "people")} + owners`}`);
      await Promise.all([onSaved(), globalMutate("/api/users"), globalMutate("/api/roles")]);
      onClose();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-[500px] rounded-3xl border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex items-start gap-3 shrink-0">
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg text-white shadow-sm" style={{ backgroundColor: shop.color }}>
            <ShopIcon icon={shop.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[1px]">People</span>
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 truncate">Who can open {shop.name}?</DialogTitle>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <i aria-hidden="true" className="ph-bold ph-x" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
          <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <i aria-hidden="true" className="ph-bold ph-shield-check text-indigo-500 text-lg mt-0.5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed text-indigo-900/80">
              Owners can always open this shop. Give others Admin or Staff here; what each role can do is set in Roles &amp;
              Permissions.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center text-sm font-semibold text-rose-600">
              Couldn&apos;t load the team. Close and try again.
            </div>
          ) : (
            <div className="space-y-4">
              {owners.length > 0 && (
                <div>
                  <div className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Owners</div>
                  <ul className="space-y-1.5">
                    {owners.map((user) => (
                      <li key={user.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                        <Avatar user={user} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{user.name || user.email}</span>
                          <span className="block truncate text-[11px] font-semibold text-orange-600">Owner &middot; always has access</span>
                        </span>
                        <i aria-hidden="true" className="ph-fill ph-lock-simple text-slate-300" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="mb-1.5 px-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  <span>Team</span>
                  <span className="normal-case tracking-normal font-semibold">{assigned === 0 ? "No one yet" : `${pluralize(assigned, "person", "people")} with access`}</span>
                </div>
                {candidates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                    <i aria-hidden="true" className="ph ph-users-three text-3xl text-slate-300" />
                    <p className="mt-2 text-sm font-bold text-slate-500">No team members to add</p>
                    <p className="text-xs text-slate-400 mt-1">Invite people from Settings → Users &amp; Team first.</p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {candidates.map((user) => {
                      const hasAccess = !!draft[user.id];
                      return (
                        <li
                          key={user.id}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                            hasAccess ? "border-orange-200 bg-orange-50/40" : "border-slate-100 bg-white"
                          }`}
                        >
                          <Avatar user={user} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold text-slate-800">{user.name || user.email}</span>
                              {user.status !== "ACTIVE" && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-500 shrink-0">
                                  {STATUS_LABELS[user.status]}
                                </span>
                              )}
                            </span>
                            {user.email && user.name && <span className="block truncate text-[11px] font-semibold text-slate-400">{user.email}</span>}
                          </span>
                          <div className="w-[128px] sm:w-[150px] shrink-0">
                            <CustomDropdown
                              options={options}
                              value={draft[user.id] ?? ""}
                              onChange={(roleId) => setDraft((prev) => ({ ...prev, [user.id]: roleId }))}
                              placeholder="No access"
                              className="[&>button]:h-10 [&>button]:text-sm [&>button]:px-3"
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving || isLoading || !!error}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <i aria-hidden="true" className="ph ph-circle-notch animate-spin" /> : <i aria-hidden="true" className="ph-bold ph-check" />}
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
