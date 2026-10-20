"use client";

import StudioItemsTable from "./StudioItemsTable";
import type { StudioRecycleBinState } from "./useStudioRecycleBin";
import { useRecycleBinAccess } from "../common/useIsOwner";

const SOURCE_TABS = [
  { label: "All Sources", val: "" },
  { label: "Bookings", val: "booking" },
  { label: "Transactions", val: "transaction" },
  { label: "Orders", val: "product-order" },
];

export default function StudioRecycleBin({ bin }: { bin: StudioRecycleBinState }) {
  const { page, limit, total, totalPages, items, selectedIds } = bin;
  // Permanent deletes (single, bulk, empty bin) are owner-only; restoring needs Recycle Bin Manage.
  const { canDelete, canRestore } = useRecycleBinAccess();

  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[1.15rem] font-bold text-slate-900 mb-1">Recycle Bin</h2>
          <p className="text-sm text-slate-500">Deleted items are kept here for 30 days before being permanently removed.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex max-w-full overflow-x-auto scrollbar-hide bg-slate-100 p-1 rounded-xl">
            {SOURCE_TABS.map((tab) => (
              <button
                type="button"
                key={tab.label}
                onClick={() => bin.changeSourceFilter(tab.val)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap shrink-0 transition-colors ${bin.sourceFilter === tab.val ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!canDelete ? null : bin.confirmEmptyBin ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red-600">Empty bin?</span>
              <button type="button" onClick={bin.handleEmptyBinConfirm} disabled={bin.isDeletingEmpty} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm">{bin.isDeletingEmpty ? "..." : "Yes"}</button>
              <button type="button" onClick={() => bin.setConfirmEmptyBin(false)} disabled={bin.isDeletingEmpty} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">No</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => bin.setConfirmEmptyBin(true)}
              disabled={total === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ph-bold ph-trash"></i>
              Empty Bin
            </button>
          )}
        </div>
      </div>

      {bin.actionError && (
        <div className="bg-red-50 text-red-600 text-sm font-semibold p-3 rounded-xl mb-4 animate-[fadeIn_0.2s_ease-out]">
          {bin.actionError}
        </div>
      )}

      {selectedIds.size > 0 && (canRestore || canDelete) && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 flex items-center justify-between animate-[fadeIn_0.2s_ease-out]">
          <span className="text-sm font-semibold text-orange-800 px-2">{selectedIds.size} items selected</span>
          <div className="flex items-center gap-2">
            {canRestore && (
              <button type="button" onClick={bin.handleBulkRestore} className="px-3 py-1.5 bg-white text-orange-600 rounded-lg text-xs font-bold border border-orange-200 hover:bg-orange-50 transition-colors">
                Restore Selected
              </button>
            )}
            {!canDelete ? null : bin.confirmBulkDelete ? (
              <div className="flex items-center gap-2 border-l border-orange-200 pl-2 ml-1">
                <span className="text-xs font-bold text-red-600">Delete {selectedIds.size}?</span>
                <button type="button" onClick={bin.handleBulkDeleteConfirm} disabled={bin.isDeletingBulk} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm">{bin.isDeletingBulk ? "..." : "Yes"}</button>
                <button type="button" onClick={() => bin.setConfirmBulkDelete(false)} disabled={bin.isDeletingBulk} className="px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 border border-slate-200 transition-colors">No</button>
              </div>
            ) : (
              <button type="button" onClick={() => bin.setConfirmBulkDelete(true)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm">
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      <StudioItemsTable bin={bin} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-sm font-medium text-slate-500">
            Showing {items.length > 0 ? page * limit + 1 : 0} to {Math.min((page + 1) * limit, total)} of {total} entries
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => bin.setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <i className="ph-bold ph-caret-left"></i>
            </button>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => bin.setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <i className="ph-bold ph-caret-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
