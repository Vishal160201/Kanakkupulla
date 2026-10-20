"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import type { PersonalExpenseSnapshot, RecycleBinResponse } from "@/types/settings";
import RowActions from "./RowActions";

export default function PersonalRecycleBin() {
  const { data: response, mutate, isLoading } = useSWR<RecycleBinResponse<PersonalExpenseSnapshot>>(
    "/api/recycle-bin?source=PERSONAL_EXPENSE",
    fetcher
  );
  const items = response?.items || [];
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/recycle-bin/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Expense Restored");
      mutate();
    } catch {
      toast.error("Failed to restore expense");
    }
  };

  const handlePermanentDeleteConfirm = async (id: string) => {
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/recycle-bin`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Expense permanently deleted");
      mutate();
    } catch {
      toast.error("Error deleting expense");
    } finally {
      setIsDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 mt-4 animate-[fadeIn_0.2s_ease-out]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-gray-200">
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading...</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={5} className="p-12 text-center text-slate-400">Personal recycle bin is empty</td></tr>
          ) : (
            items.map((item) => {
              const e = item.originalData;
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 text-sm text-slate-600">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-bold text-slate-900">{e.title}</td>
                  <td className="p-4 text-sm text-slate-600">
                    <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-bold">{e.category}</span>
                  </td>
                  <td className={`p-4 text-sm font-bold ${e.type === "CREDIT" ? "text-emerald-600" : "text-slate-900"}`}>
                    {e.type === "CREDIT" ? "+" : "-"}₹{e.amount?.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <RowActions
                      isConfirming={confirmDeleteId === item.id}
                      isDeleting={isDeletingId === item.id}
                      onRestore={() => handleRestore(item.id)}
                      onAskDelete={() => setConfirmDeleteId(item.id)}
                      onConfirmDelete={() => handlePermanentDeleteConfirm(item.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
