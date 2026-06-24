"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { FileDashed, Funnel, Trash, ArrowCounterClockwise, CaretLeft, CaretRight } from "@phosphor-icons/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RecycleBin() {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const query = new URLSearchParams();
  query.append("limit", limit.toString());
  query.append("offset", (page * limit).toString());
  if (sourceFilter) query.append("source", sourceFilter);

  const { data, error, mutate, isLoading } = useSWR(`/api/recycle-bin?${query.toString()}`, fetcher);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map((i: any) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/recycle-bin/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to restore");
      toast.success("Item restored");
      mutate();
      const newSet = new Set(selectedIds);
      newSet.delete(id);
      setSelectedIds(newSet);
    } catch (e) {
      toast.error("Error restoring item");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/recycle-bin/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Item permanently deleted");
      mutate();
      const newSet = new Set(selectedIds);
      newSet.delete(id);
      setSelectedIds(newSet);
    } catch (e) {
      toast.error("Error deleting item");
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch(`/api/recycle-bin/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (!res.ok) throw new Error("Failed to bulk restore");
      toast.success(`Restored ${selectedIds.size} items`);
      setSelectedIds(newSet => { newSet.clear(); return new Set(); });
      mutate();
    } catch (e) {
      toast.error("Error restoring items");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} items?`)) return;
    try {
      const res = await fetch(`/api/recycle-bin`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (!res.ok) throw new Error("Failed to bulk delete");
      toast.success(`Permanently deleted ${selectedIds.size} items`);
      setSelectedIds(newSet => { newSet.clear(); return new Set(); });
      mutate();
    } catch (e) {
      toast.error("Error deleting items");
    }
  };

  const handleEmptyBin = async () => {
    if (!confirm("Are you sure you want to EMPTY the entire recycle bin? This will permanently delete ALL items. This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/recycle-bin/empty`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to empty bin");
      toast.success("Recycle bin emptied");
      setSelectedIds(newSet => { newSet.clear(); return new Set(); });
      mutate();
    } catch (e) {
      toast.error("Error emptying bin");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[1.15rem] font-bold text-slate-900 mb-1">Recycle Bin</h2>
          <p className="text-sm text-slate-500">Deleted items are kept here for 30 days before being permanently removed.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(0); setSelectedIds(new Set()); }}
              className="appearance-none pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="booking">Bookings</option>
              <option value="transaction">Transactions</option>
              <option value="product-order">Product Orders</option>
            </select>
            <Funnel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" weight="bold" />
          </div>

          <button
            onClick={handleEmptyBin}
            disabled={total === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash weight="bold" />
            Empty Bin
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 flex items-center justify-between animate-[fadeIn_0.2s_ease-out]">
          <span className="text-sm font-semibold text-orange-800 px-2">{selectedIds.size} items selected</span>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkRestore} className="px-3 py-1.5 bg-white text-orange-600 rounded-lg text-xs font-bold border border-orange-200 hover:bg-orange-50 transition-colors">
              Restore Selected
            </button>
            <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm">
              Delete Selected
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200">
              <th className="p-4 w-[40px]">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Entry Name</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trashed By</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trashed Time</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                    <span className="text-sm font-medium">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                      <FileDashed size={24} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium">Recycle bin is empty</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => handleSelect(item.id)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-bold text-slate-900">{item.entryName}</span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-600 capitalize">
                      {item.itemType}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600 font-medium">
                    {item.trashedBy}
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(item.trashedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Restore"
                      >
                        <ArrowCounterClockwise size={18} weight="bold" />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Permanently"
                      >
                        <Trash size={18} weight="bold" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-sm font-medium text-slate-500">
            Showing {items.length > 0 ? page * limit + 1 : 0} to {Math.min((page + 1) * limit, total)} of {total} entries
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <CaretLeft weight="bold" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <CaretRight weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
