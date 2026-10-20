"use client";

import { AlertTriangle, CheckCircle2, Loader2, Tag, Wallet } from "lucide-react";
import type { GiftOrderDetails } from "./useGiftOrderDetails";

interface RollbackWarningProps {
  isUpdatingStatus: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RollbackWarning({ isUpdatingStatus, onCancel, onConfirm }: RollbackWarningProps) {
  return (
    <div className="col-span-1 lg:col-span-12 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-[fadeIn_0.2s_ease-out]">
      <div>
        <h4 className="text-sm font-bold text-orange-900 mb-1 flex items-center gap-2">
          <AlertTriangle size={16} /> Immutable Ledger Warning
        </h4>
        <p className="text-xs text-orange-700 font-medium">
          Rolling back from DELIVERED will <span className="font-bold">NOT</span> reverse the linked collection transactions. You must adjust the ledger manually if needed.
        </p>
      </div>
      <div className="flex gap-2 w-full sm:w-auto shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isUpdatingStatus !== null}
          className="flex-1 sm:flex-none flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-70"
        >
          {isUpdatingStatus ? <Loader2 size={14} className="animate-spin inline" /> : null}
          Confirm Rollback
        </button>
      </div>
    </div>
  );
}

interface DueCollectionPanelProps {
  dueAmount: number;
  collection: GiftOrderDetails["collection"];
}

export function DueCollectionPanel({ dueAmount, collection }: DueCollectionPanelProps) {
  const {
    collectionError, collectionSuccess, collectionInput, setCollectionInput,
    dueCollectionDate, setDueCollectionDate, isCollecting,
    cancelDueCollection, handleConfirmCollection, handleDiscountCollection,
  } = collection;
  const disabled = isCollecting || collectionSuccess;

  return (
    <div className="col-span-1 lg:col-span-12 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-[fadeIn_0.2s_ease-out] max-h-[200px] sm:max-h-none overflow-y-auto sm:overflow-visible">
      <div>
        <h4 className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-2">
          <Wallet size={16} /> Collect Due Amount
        </h4>
        <p className="text-xs text-amber-700 font-medium">
          Marking as DELIVERED requires collecting remaining due (Total: <span className="font-bold">₹{dueAmount.toLocaleString()}</span>).
        </p>
        {collectionError && <p className="text-[0.65rem] font-bold text-red-600 mt-1">{collectionError}</p>}
        {collectionSuccess && <p className="text-[0.65rem] font-bold text-green-600 mt-1">Collection successful!</p>}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
        <div className="relative w-full sm:w-32">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
          <input
            type="number"
            aria-label="Amount to collect"
            value={collectionInput}
            onChange={(e) => setCollectionInput(e.target.value)}
            disabled={disabled}
            className="w-full bg-white border border-amber-200 rounded-xl pl-6 pr-3 py-2 text-slate-800 font-bold text-xs focus:border-amber-400 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <div className="relative w-full sm:w-36">
          <input
            type="date"
            aria-label="Collection date"
            value={dueCollectionDate}
            onChange={(e) => setDueCollectionDate(e.target.value)}
            disabled={disabled}
            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-800 font-bold text-xs focus:border-amber-400 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={cancelDueCollection}
            disabled={disabled}
            className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmCollection}
            disabled={disabled}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-70"
          >
            {isCollecting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {collectionSuccess ? "Collected" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={handleDiscountCollection}
            disabled={disabled}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-70"
          >
            {isCollecting ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
            Discounted
          </button>
        </div>
      </div>
    </div>
  );
}
