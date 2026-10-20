"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Shop } from "@/types/shops";
import type { AccessRole, TeamMember, UpdateUserInput } from "@/types/settings";
import UserAccessFields, { type AssignmentDraft } from "./users/UserAccessFields";
import { STATUS_LABELS, STATUS_STYLES, avatarColorOf, initialsOf, readError, userIdLabel } from "./users/userHelpers";

interface EditUserModalProps {
  user: TeamMember;
  isCurrentUser: boolean;
  /** Owners in the studio (the last one can't be demoted). */
  ownerCount: number;
  shops: Shop[];
  roles: AccessRole[];
  isLoadingOptions: boolean;
  optionsError: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Open the deactivate / reactivate confirmation (ToggleStatusModal). */
  onRequestToggleStatus: (user: TeamMember) => void;
  /** Open the remove confirmation (DeleteUserModal). */
  onRequestDelete: (user: TeamMember) => void;
}

type FieldErrors = Partial<Record<"name" | "phone" | "assignments", string>>;

const inputClass =
  "w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all";
const readonlyClass = "w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed";
const labelClass = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";

const toDraft = (user: TeamMember): AssignmentDraft =>
  Object.fromEntries((user.assignments ?? []).map((a) => [a.shopId, a.roleId]));

export default function EditUserModal({
  user,
  isCurrentUser,
  ownerCount,
  shops,
  roles,
  isLoadingOptions,
  optionsError,
  onClose,
  onSuccess,
  onRequestToggleStatus,
  onRequestDelete,
}: EditUserModalProps) {
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [isOwner, setIsOwner] = useState(user.role === "OWNER");
  const [assignments, setAssignments] = useState<AssignmentDraft>(() => toDraft(user));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const wasOwner = user.role === "OWNER";
  const ownerLockedReason =
    wasOwner && isCurrentUser
      ? "You can't remove your own owner status"
      : wasOwner && ownerCount <= 1
        ? "The studio needs at least one owner"
        : undefined;

  const activeShopIds = new Set(shops.filter((s) => !s.isArchived).map((s) => s.id));
  const statusStyle = STATUS_STYLES[user.status] ?? STATUS_STYLES.ACTIVE;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: FieldErrors = {};
    if (!name.trim()) found.name = "Enter a name";
    if (!isOwner && !Object.entries(assignments).some(([shopId, roleId]) => roleId && activeShopIds.has(shopId))) {
      found.assignments = "Give access to at least one shop, or make them an Owner";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body: UpdateUserInput = { name: name.trim(), phone: phone.trim(), isOwner };
    // Owners don't need shop roles. Assignments in archived shops are kept as they were.
    if (!isOwner) {
      body.assignments = Object.entries(assignments)
        .filter(([, roleId]) => !!roleId)
        .map(([shopId, roleId]) => ({ shopId, roleId }));
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { message, errors: serverErrors } = await readError(res, "Failed to update user");
        if (serverErrors) setErrors(serverErrors as FieldErrors);
        toast.error(message);
        return;
      }
      toast.success("User updated");
      onSuccess();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isActive = user.status !== "INACTIVE";

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-[540px] rounded-3xl border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 shrink-0 rounded-full text-white flex items-center justify-center font-bold text-sm ${avatarColorOf(user.name)}`}>
              {initialsOf(user.name, user.email)}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-extrabold text-slate-900 truncate">Edit team member</DialogTitle>
              <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span className="font-mono">{userIdLabel(user)}</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                  {STATUS_LABELS[user.status]}
                </span>
              </DialogDescription>
            </div>
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

        <form onSubmit={handleSave} noValidate className="flex flex-col min-h-0">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto bg-slate-50/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-name" className={labelClass}>Full name</label>
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Kumar"
                  aria-invalid={!!errors.name}
                  className={`${inputClass} ${errors.name ? "border-rose-400" : "border-slate-200"}`}
                />
                {errors.name && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="edit-phone" className={labelClass}>Mobile (WhatsApp)</label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  aria-invalid={!!errors.phone}
                  className={`${inputClass} ${errors.phone ? "border-rose-400" : "border-slate-200"}`}
                />
                {errors.phone && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{errors.phone}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="edit-email" className={labelClass}>Email address</label>
              <input id="edit-email" type="email" value={user.email || ""} readOnly className={readonlyClass} />
            </div>

            <UserAccessFields
              isOwner={isOwner}
              onOwnerChange={(next) => {
                setIsOwner(next);
                setErrors((prev) => ({ ...prev, assignments: undefined }));
              }}
              ownerLockedReason={ownerLockedReason}
              shops={shops}
              roles={roles}
              isLoadingOptions={isLoadingOptions}
              optionsError={optionsError}
              assignments={assignments}
              onAssign={(shopId, roleId) => {
                setAssignments((prev) => ({ ...prev, [shopId]: roleId }));
                if (roleId) setErrors((prev) => ({ ...prev, assignments: undefined }));
              }}
              error={errors.assignments}
              disabled={isSaving}
            />

            {!isCurrentUser && (
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onRequestToggleStatus(user)}
                  disabled={isSaving}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors disabled:opacity-50 ${
                    isActive ? "border-amber-200 bg-white text-amber-700 hover:bg-amber-50" : "border-green-200 bg-white text-green-700 hover:bg-green-50"
                  }`}
                >
                  <i aria-hidden="true" className={`ph-bold ${isActive ? "ph-pause-circle" : "ph-play-circle"}`} />
                  {isActive ? "Deactivate user" : "Reactivate user"}
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(user)}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-sm font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <i aria-hidden="true" className="ph-bold ph-trash" />
                  Remove user
                </button>
              </div>
            )}
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
            <button type="button" onClick={onClose} disabled={isSaving} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <Tooltip content={isLoadingOptions ? "Loading shops and roles…" : undefined}>
              <span className="inline-flex">
                <button
                  type="submit"
                  disabled={isSaving || isLoadingOptions}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <i aria-hidden="true" className="ph ph-circle-notch animate-spin" />}
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              </span>
            </Tooltip>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
