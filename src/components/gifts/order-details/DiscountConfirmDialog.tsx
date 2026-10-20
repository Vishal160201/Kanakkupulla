"use client";

import { CheckCircle2, Loader2, Tag } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface DiscountConfirmDialogProps {
  pendingAmount: number | null;
  dueAmount: number;
  isCollecting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DiscountConfirmDialog({ pendingAmount, dueAmount, isCollecting, onCancel, onConfirm }: DiscountConfirmDialogProps) {
  return (
    <Dialog open={pendingAmount !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 border-0 shadow-2xl">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <Tag size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Discount Remaining Amount?</h3>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            You are collecting <span className="font-bold text-slate-800">₹{pendingAmount?.toLocaleString()}</span> out of <span className="font-bold text-slate-800">₹{dueAmount.toLocaleString()}</span>.
            <br />
            Is the remaining <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">₹{(dueAmount - (pendingAmount || 0)).toLocaleString()}</span> discounted?
          </p>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              disabled={isCollecting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
              disabled={isCollecting}
            >
              {isCollecting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Yes, Discount It
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
