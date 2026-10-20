"use client";

interface RowActionsProps {
  isConfirming: boolean;
  isDeleting: boolean;
  onRestore: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  /** Show native tooltips on the confirm/cancel buttons (studio table only). */
  confirmTitles?: boolean;
}

/** Hover actions for a recycle-bin row: restore, or delete with inline confirmation. */
export default function RowActions({
  isConfirming,
  isDeleting,
  onRestore,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
  confirmTitles = false,
}: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {isConfirming ? (
        <div className="flex items-center gap-1">
          <span className="text-[0.7rem] font-bold text-red-500 uppercase tracking-wider mr-2">Delete?</span>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title={confirmTitles ? "Confirm" : undefined}
            aria-label="Confirm permanent delete"
          >
            <span className="text-xs px-1 font-bold">{isDeleting ? "..." : "✓"}</span>
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            disabled={isDeleting}
            className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            title={confirmTitles ? "Cancel" : undefined}
            aria-label="Cancel delete"
          >
            <span className="text-xs px-1 font-bold">✕</span>
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onRestore}
            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Restore"
            aria-label="Restore"
          >
            <i className="ph-bold ph-arrow-counter-clockwise text-[18px]"></i>
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Permanently"
            aria-label="Delete permanently"
          >
            <i className="ph-bold ph-trash text-[18px]"></i>
          </button>
        </>
      )}
    </div>
  );
}
