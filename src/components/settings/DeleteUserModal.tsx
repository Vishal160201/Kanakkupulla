"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TeamMember } from "@/types/settings";
import { avatarColorOf, initialsOf, roleLabelOf } from "./users/userHelpers";

interface DeleteUserModalProps {
  user: Pick<TeamMember, "id" | "name" | "email" | "role">;
  onClose: () => void;
  onConfirm: () => Promise<unknown> | void;
}

/** Confirms removing a team member (Owner or member) from the studio. */
export default function DeleteUserModal({ user, onClose, onConfirm }: DeleteUserModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-[400px] sm:max-w-[400px] rounded-3xl border-0 bg-white p-7 text-center shadow-2xl gap-0"
      >
        <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-5">
          <i aria-hidden="true" className="ph-fill ph-warning text-red-500 text-3xl" />
        </div>
        <DialogTitle className="text-lg font-extrabold text-slate-900 mb-1">Remove team member?</DialogTitle>
        <p className="text-sm text-slate-500 mb-6">
          This can&apos;t be undone. {user.role === "OWNER" ? "They'll lose owner access to every shop and setting." : "They'll lose access to every shop they were given."}
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 ${avatarColorOf(user.name)}`}>
            {initialsOf(user.name, user.email)}
          </div>
          <div className="text-left min-w-0">
            <p className="font-bold text-sm text-slate-900 truncate">{user.name || "Unnamed user"}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <p className="text-[0.65rem] text-slate-400 uppercase font-semibold tracking-wider mt-0.5">{roleLabelOf(user)}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <i aria-hidden="true" className={deleting ? "ph ph-circle-notch animate-spin" : "ph-fill ph-trash"} />
            {deleting ? "Removing…" : "Remove user"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
