"use client";

import { pluralize } from "./roleMeta";

interface SaveBarProps {
  changeCount: number;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/** Sticky footer holding unsaved grid edits. */
export default function SaveBar({ changeCount, isSaving, onDiscard, onSave }: SaveBarProps) {
  const isDirty = changeCount > 0;
  // Only shown while there is something to save (or a save is finishing), so it never covers the grid needlessly
  if (!isDirty && !isSaving) return null;
  return (
    <div className="sticky bottom-3 z-20 mt-4">
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-colors ${
          isDirty ? "border-orange-200 bg-white shadow-orange-500/10" : "border-slate-100 bg-white/95 shadow-slate-900/5"
        }`}
      >
        <span aria-live="polite" className="flex items-center gap-2 min-w-0 text-xs sm:text-sm font-bold text-slate-600">
          <i aria-hidden="true" className={`ph-bold ${isDirty ? "ph-pencil-simple-line text-orange-500" : "ph-check-circle text-emerald-500"}`} />
          <span className="truncate">{isDirty ? `${pluralize(changeCount, "unsaved change")}` : "All changes saved"}</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDiscard}
            disabled={!isDirty || isSaving}
            className="h-10 px-3 sm:px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="h-10 px-4 sm:px-5 rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? <i aria-hidden="true" className="ph ph-circle-notch animate-spin" /> : <i aria-hidden="true" className="ph-bold ph-check" />}
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
