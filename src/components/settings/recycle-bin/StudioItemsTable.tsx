"use client";

import RowActions from "./RowActions";
import type { StudioRecycleBinState } from "./useStudioRecycleBin";
import { Tooltip } from "@/components/ui/Tooltip";
import { useRecycleBinAccess } from "../common/useIsOwner";
import Checkbox from "@/components/ui/Checkbox";

const typeBadgeClass = (type: string) =>
  type === "INCOME" ? "bg-emerald-500/15 text-emerald-600" :
  type === "EXPENSE" ? "bg-red-500/15 text-red-600" :
  "bg-slate-100 text-slate-600";

const formatTrashedAt = (value: string) =>
  new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function StudioItemsTable({ bin }: { bin: StudioRecycleBinState }) {
  const { items, selectedIds } = bin;
  const { canDelete, canRestore } = useRecycleBinAccess();

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-gray-200">
            <th className="p-2 sm:p-4 w-[40px]">
              <Checkbox
                ariaLabel="Select all"
                size="sm"
                checked={items.length > 0 && selectedIds.size === items.length}
                onChange={bin.handleSelectAll}
              />
            </th>
            <th className="hidden md:table-cell p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
            <th className="p-2 sm:p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
            <th className="hidden sm:table-cell p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
            <th className="hidden lg:table-cell p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trashed By</th>
            <th className="hidden sm:table-cell p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trashed Time</th>
            <th className="p-2 sm:p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bin.isLoading ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                  <span className="text-sm font-medium">Loading...</span>
                </div>
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-12 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                    <i className="ph ph-file-dashed text-[24px] text-slate-400"></i>
                  </div>
                  <span className="text-sm font-medium">Recycle bin is empty</span>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-2 sm:p-4">
                  <Checkbox
                    ariaLabel={`Select ${item.entryName}`}
                    size="sm"
                    checked={selectedIds.has(item.id)}
                    onChange={() => bin.handleSelect(item.id)}
                  />
                </td>
                <td className="hidden md:table-cell p-4 max-w-[150px]">
                  <Tooltip content={item.transactionId}>
                    <span className="text-sm font-bold text-slate-500 font-mono block truncate">{item.transactionId}</span>
                  </Tooltip>
                </td>
                <td className="p-2 sm:p-4 max-w-[200px]">
                  <Tooltip content={item.entryName}>
                    <span className="text-sm font-bold text-slate-900 block truncate">{item.entryName}</span>
                  </Tooltip>
                  {/* Phones drop the Type and Trashed Time columns, so show both under the name */}
                  <div className="sm:hidden mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide capitalize ${typeBadgeClass(item.originalType)}`}>
                      {item.originalType}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{formatTrashedAt(item.trashedAt)}</span>
                  </div>
                </td>
                <td className="hidden sm:table-cell p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold tracking-wide capitalize ${typeBadgeClass(item.originalType)}`}>
                    {item.originalType}
                  </span>
                </td>
                <td className="hidden lg:table-cell p-4 text-sm text-slate-600 font-medium">
                  {item.trashedBy}
                </td>
                <td className="hidden sm:table-cell p-4 text-sm text-slate-500">
                  {formatTrashedAt(item.trashedAt)}
                </td>
                <td className="p-2 sm:p-4 text-right">
                  <RowActions
                    confirmTitles
                    canDelete={canDelete}
                    canRestore={canRestore}
                    isConfirming={bin.confirmDeleteId === item.id}
                    isDeleting={bin.isDeletingId === item.id}
                    onRestore={() => bin.handleRestore(item.id)}
                    onAskDelete={() => bin.setConfirmDeleteId(item.id)}
                    onConfirmDelete={() => bin.handlePermanentDeleteConfirm(item.id)}
                    onCancelDelete={() => bin.setConfirmDeleteId(null)}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
