"use client";

import { useState } from "react";

interface DeleteUserModalProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
  onClose: () => void;
  onConfirm: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Studio Admin",
  STAFF: "Staff",
  PHOTOGRAPHER: "Photographer",
};

export default function DeleteUserModal({ user, onClose, onConfirm }: DeleteUserModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-gray-100 w-full max-w-[400px] mx-4 overflow-hidden animate-fade-in">
        <div className="p-7 text-center">
          {/* Warning Icon */}
          <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-5">
            <i className="ph-fill ph-warning text-red-500 text-3xl"></i>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">Remove Team Member?</h3>
          <p className="text-sm text-slate-500 mb-6">
            This action cannot be undone. The user will lose all access to your studio.
          </p>

          {/* User Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900">{user.name || "Unnamed User"}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <p className="text-[0.65rem] text-slate-400 uppercase font-semibold tracking-wider mt-0.5">
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={deleting}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Removing...
                </>
              ) : (
                <>
                  <i className="ph-fill ph-trash text-base"></i>
                  Remove User
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
