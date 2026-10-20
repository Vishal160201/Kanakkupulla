"use client";

import { Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/** Bottom sticky action bar of the details view. Without `onEdit` (no Bookings Manage) there is no Edit button. */
export function BookingActionBar({ displayId, onEdit, onClose }: { displayId: string; onEdit?: () => void; onClose: () => void }) {
  return (
    <div className="shrink-0 h-20 bg-white border-t border-slate-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-4 sm:px-6 flex items-center justify-between gap-4 z-40 rounded-b-[2rem]">
      {/* Info group is dropped on phones so the buttons get the full row */}
      <div className="hidden sm:flex items-center gap-3 min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Action Center</p>
        <p className="text-sm font-bold text-slate-800 border-l border-slate-200 pl-3 truncate">Viewing: {displayId}</p>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto shrink-0">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm whitespace-nowrap transition-colors"
          >
            Edit Booking
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 sm:flex-none px-8 py-2.5 whitespace-nowrap bg-[#0B1E40] text-white hover:bg-[#152a55] rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-900/20"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function DeleteBookingDialog({ open, onOpenChange, isDeleting, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] rounded-3xl p-6 bg-white border-0 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Booking?</h3>
          <p className="text-slate-500 mb-8 font-medium">This action cannot be undone. This will permanently remove the booking and all related data.</p>
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Yes, Delete"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
