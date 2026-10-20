"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { toast } from "sonner";
import type { Transaction, TransactionsOverviewResponse } from "@/types/transactions";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { groupTodayTransactions } from "./overviewData";
import TodayTransactionRow from "./TodayTransactionRow";

interface TodayTransactionsPanelProps {
  /** SWR key of the overview response, updated optimistically on delete. */
  overviewKey: string;
  today: Date;
  todayIncome: number;
  todayExpense: number;
  todayNet: number;
  todayTransactions: Transaction[];
  /** Label each row with its shop (the "All Shops" view). */
  showShop?: boolean;
}

export default function TodayTransactionsPanel({ overviewKey, today, todayIncome, todayExpense, todayNet, todayTransactions, showShop = false }: TodayTransactionsPanelProps) {
  const { openTransactionForm, openTransactionDetails } = useGlobalForm();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string, message: string } | null>(null);

  const handleDeleteConfirm = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsDeletingId(id);
    setDeleteError(null);
    try {
      const isGroup = id.startsWith('grp_');
      const url = isGroup ? `/api/transactions/bulk/${id}` : `/api/transactions/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 409 && errorData.error) {
          // Locked entry (e.g. created by Fertilizer Inventory): explain and drop the confirm state.
          toast.error(errorData.error);
          setConfirmDeleteId(null);
          setIsDeletingId(null);
          return;
        }
        throw new Error(errorData.error || "Failed to delete");
      }

      // Optimistic update
      const keep = (tx: Transaction) => isGroup ? tx.groupId !== id : tx.id !== id;
      mutate(overviewKey, (currentData: TransactionsOverviewResponse | undefined) => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          recentTransactions: currentData.recentTransactions?.filter(keep),
          todayTransactions: currentData.todayTransactions?.filter(keep),
        };
      }, { revalidate: true });

      setConfirmDeleteId(null);
      setIsDeletingId(null);
    } catch (err) {
      setDeleteError({ id, message: (err instanceof Error && err.message) || "Failed to delete" });
      setIsDeletingId(null);
    }
  };

  return (
    <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl mb-8 transition-transform duration-300 hover:-translate-y-1 group">
      {/* Animated Glow Orbs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-orange-500 rounded-full blur-[120px] opacity-15 group-hover:opacity-25 transition-opacity duration-700" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-500 rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500 rounded-full blur-[160px] opacity-[0.04]" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 sm:px-8 pt-5 sm:pt-7 pb-0 gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <i className="ph-bold ph-receipt text-white text-lg" />
          </div>
          <div>
            <h3 className="text-white text-[1rem] sm:text-[1.15rem] font-extrabold tracking-tight leading-tight">Today&apos;s Transactions</h3>
            <p className="text-slate-400 text-[0.65rem] sm:text-[0.7rem] font-semibold tracking-wide uppercase">{today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 px-5 sm:px-8 py-5">
        <Link href="/transactions/allTransactions?view=day&type=INCOME" className="block outline-none">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <i className="ph-bold ph-arrow-down-left text-emerald-400 text-xs" />
              </div>
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Income</span>
            </div>
            <span className="text-white text-[1.5rem] font-extrabold tracking-tight">₹{todayIncome.toLocaleString('en-IN')}</span>
          </div>
        </Link>
        <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="block outline-none">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                <i className="ph-bold ph-arrow-up-right text-red-400 text-xs" />
              </div>
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Expense</span>
            </div>
            <span className="text-white text-[1.5rem] font-extrabold tracking-tight">₹{todayExpense.toLocaleString('en-IN')}</span>
          </div>
        </Link>
        <Link href="/transactions/allTransactions?view=day" className="block outline-none">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-lg ${todayNet >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                <i className={`ph-bold ${todayNet >= 0 ? 'ph-trend-up text-emerald-400' : 'ph-trend-down text-red-400'} text-xs`} />
              </div>
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Net Today</span>
            </div>
            <span className={`text-[1.5rem] font-extrabold tracking-tight ${todayNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {todayNet >= 0 ? '+' : ''}₹{todayNet.toLocaleString('en-IN')}
            </span>
          </div>
        </Link>
      </div>

      <div className="relative z-10 px-5 sm:px-8 pb-5 sm:pb-7">
        {todayTransactions.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-dashed border-white/10 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <i className="ph ph-receipt text-3xl text-slate-500" />
            </div>
            <p className="text-slate-400 font-semibold text-sm">No transactions recorded today</p>
            <p className="text-slate-500 text-xs mt-1">Add your first transaction to see it here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1 sm:pr-2">
            {groupTodayTransactions(todayTransactions).map((txn, idx) => (
              <TodayTransactionRow
                key={txn.id}
                txn={txn}
                index={idx}
                showShop={showShop}
                isConfirmingDelete={confirmDeleteId === txn.id}
                isDeleting={isDeletingId === txn.id}
                deleteErrorMessage={deleteError?.id === txn.id ? deleteError.message : null}
                onOpen={openTransactionDetails}
                onEdit={(id) => openTransactionForm(id)}
                onRequestDelete={(id) => { setConfirmDeleteId(id); setDeleteError(null); }}
                onConfirmDelete={handleDeleteConfirm}
                onCancelDelete={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                onDismissError={() => setDeleteError(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
