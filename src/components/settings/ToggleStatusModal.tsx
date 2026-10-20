"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TeamMember } from "@/types/settings";
import { STATUS_LABELS, avatarColorOf, initialsOf, roleLabelOf } from "./users/userHelpers";

interface ToggleStatusModalProps {
  user: Pick<TeamMember, "id" | "name" | "email" | "role" | "status">;
  onClose: () => void;
  onConfirm: () => Promise<unknown> | void;
}

/** Confirms deactivating (ACTIVE / PENDING -> INACTIVE) or reactivating (INACTIVE -> ACTIVE) a team member. */
export default function ToggleStatusModal({ user, onClose, onConfirm }: ToggleStatusModalProps) {
  const [updating, setUpdating] = useState(false);

  const handleConfirm = async () => {
    setUpdating(true);
    try {
      await onConfirm();
    } finally {
      setUpdating(false);
    }
  };

  const isDisabling = user.status !== "INACTIVE";
  const actionText = isDisabling ? "Deactivate" : "Reactivate";

  return (
    <Dialog open onOpenChange={(open) => !open && !updating && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-[400px] sm:max-w-[400px] rounded-3xl border-0 bg-white p-7 text-center shadow-2xl gap-0"
      >
        <div
          className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mx-auto mb-5 ${
            isDisabling ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"
          }`}
        >
          <i aria-hidden="true" className={`ph-fill ${isDisabling ? "ph-pause-circle text-amber-500" : "ph-play-circle text-green-500"} text-3xl`} />
        </div>
        <DialogTitle className="text-lg font-extrabold text-slate-900 mb-1">{actionText} team member?</DialogTitle>
        <p className="text-sm text-slate-500 mb-6">
          {isDisabling
            ? "They won't be able to sign in until you reactivate them. Their shop access is kept."
            : user.role === "OWNER"
              ? "They'll be able to sign in again with full owner access."
              : "They'll be able to sign in again with the shop access they had."}
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 ${avatarColorOf(user.name)}`}>
            {initialsOf(user.name, user.email)}
          </div>
          <div className="text-left min-w-0">
            <p className="font-bold text-sm text-slate-900 truncate">{user.name || "Unnamed user"}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <p className="text-[0.65rem] text-slate-400 uppercase font-semibold tracking-wider mt-0.5">
              {roleLabelOf(user)} &middot; {STATUS_LABELS[user.status]}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={updating}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={updating}
            className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isDisabling ? "bg-amber-500 hover:bg-amber-600" : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {updating && <i aria-hidden="true" className="ph ph-circle-notch animate-spin" />}
            {updating ? "Updating…" : `${actionText} user`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
