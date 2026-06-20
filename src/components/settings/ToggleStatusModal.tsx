"use client";

import { useState } from "react";

interface ToggleStatusModalProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    status: string;
  };
  onClose: () => void;
  onConfirm: () => void;
}

export default function ToggleStatusModal({ user, onClose, onConfirm }: ToggleStatusModalProps) {
  const [updating, setUpdating] = useState(false);

  const handleConfirm = async () => {
    setUpdating(true);
    await onConfirm();
    setUpdating(false);
  };

  const isDisabling = user.status === "ACTIVE";
  const actionText = isDisabling ? "Disable" : "Enable";
  const newStatus = isDisabling ? "INACTIVE" : "ACTIVE";

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
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mx-auto mb-5 ${isDisabling ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
            <i className={`ph-fill ${isDisabling ? 'ph-pause-circle text-amber-500' : 'ph-play-circle text-green-500'} text-3xl`}></i>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">{actionText} Team Member?</h3>
          <p className="text-sm text-slate-500 mb-6">
            {isDisabling 
              ? "This user will no longer be able to access the dashboard until you enable them again."
              : "This user will regain access to the dashboard and their role permissions."}
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
                Current Status: {user.status}
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
              disabled={updating}
              className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isDisabling ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {updating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                actionText + " User"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
