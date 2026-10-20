"use client";

import { Tooltip } from "@/components/ui/Tooltip";

interface RowActionsProps {
  isConfirming: boolean;
  isDeleting: boolean;
  onRestore: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  /** Show tooltips on the confirm/cancel buttons (studio table only). */
  confirmTitles?: boolean;
  /** Permanent delete is owner-only in the studio bin. */
  canDelete?: boolean;
  /** Restoring needs Recycle Bin Manage. */
  canRestore?: boolean;
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
  canDelete = true,
  canRestore = true,
}: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
      {isConfirming ? (
        <div className="flex items-center gap-1">
          <span className="text-[0.7rem] font-bold text-red-500 uppercase tracking-wider mr-1 sm:mr-2">Delete?</span>
          <Tooltip content={confirmTitles ? "Confirm" : undefined}>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              aria-label="Confirm permanent delete"
            >
              {isDeleting ? <i className="ph ph-circle-notch animate-spin text-sm px-0.5" /> : <i className="ph-bold ph-check text-sm px-0.5" />}
            </button>
          </Tooltip>
          <Tooltip content={confirmTitles ? "Cancel" : undefined}>
            <button
              type="button"
              onClick={onCancelDelete}
              disabled={isDeleting}
              className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Cancel delete"
            >
              <i className="ph-bold ph-x text-sm px-0.5" />
            </button>
          </Tooltip>
        </div>
      ) : (
        <>
          {canRestore && (
            <Tooltip content="Restore">
              <button
                type="button"
                onClick={onRestore}
                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                aria-label="Restore"
              >
                <i className="ph-bold ph-arrow-counter-clockwise text-[18px]"></i>
              </button>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip content="Delete Permanently">
              <button
                type="button"
                onClick={onAskDelete}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Delete permanently"
              >
                <i className="ph-bold ph-trash text-[18px]"></i>
              </button>
            </Tooltip>
          )}
        </>
      )}
    </div>
  );
}
