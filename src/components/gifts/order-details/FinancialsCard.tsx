"use client";

import { format } from "date-fns";
import { Check, CheckCircle2, Clock, CreditCard, Receipt, Tag, TrendingUp, Wallet } from "lucide-react";
import type { GiftOrder, GiftOrderCustomData } from "@/types/gifts";
import type { GiftOrderDetails, GiftOrderEditForm } from "./useGiftOrderDetails";
import FinancialsEditForm from "./FinancialsEditForm";

interface FinancialsCardProps {
  order: GiftOrder;
  customData: GiftOrderCustomData;
  totals: GiftOrderDetails["totals"];
  /** Present only while editing. */
  editForm: GiftOrderEditForm | null;
  setEditForm: (form: GiftOrderEditForm) => void;
  onOpenTransaction: (transactionId: string) => void;
}

function FinancialsSummary({ order, customData, totals, onOpenTransaction }: Omit<FinancialsCardProps, "editForm" | "setEditForm">) {
  const { totalAmount, advanceAmount, collectedAmount, discountAmountValue, dueAmount, progressPercent } = totals;

  return (
    <div className="flex flex-col mt-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left: Total Amount */}
        <div>
          <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Amount</div>
          <div className="text-3xl font-black text-slate-800 mb-2">₹{totalAmount.toLocaleString()}</div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-[0.65rem] font-bold rounded-md border border-green-100">
            <TrendingUp size={12} /> 0% vs last month
          </div>
        </div>

        {/* Right: Progress */}
        <div className="md:border-l border-slate-100 md:pl-6 flex flex-col justify-center">
          <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Collection Progress</div>
          <div className="flex items-end gap-2 mb-2">
            <div className="text-2xl font-black text-slate-800 leading-none">{progressPercent}%</div>
            <div className="text-green-600 font-bold text-xs mb-0.5">Collected</div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mb-2 overflow-hidden">
            <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className="flex items-center gap-3 text-[0.65rem] font-bold text-slate-500">
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Collected ₹{collectedAmount.toLocaleString()}</div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Pending ₹{dueAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Advance */}
        <div className="bg-green-50/50 p-3 rounded-2xl border border-green-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-sm">
              <Wallet size={14} />
            </div>
            <div className="w-5 h-5 rounded-full border-2 border-green-200 flex items-center justify-center text-green-400">
              <Check size={12} strokeWidth={3} />
            </div>
          </div>
          <div className="text-[0.6rem] font-bold text-green-700/70 uppercase tracking-widest mb-0.5 relative z-10">Advance Paid</div>
          <div className="text-xl font-black text-slate-800 relative z-10">₹{advanceAmount.toLocaleString()}</div>
        </div>

        {/* Card 2: Due Amount or Discount */}
        {discountAmountValue > 0 && dueAmount === 0 ? (
          <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-indigo-400 text-white flex items-center justify-center shadow-sm">
                <Tag size={14} />
              </div>
            </div>
            <div className="text-[0.6rem] font-bold text-indigo-700/70 uppercase tracking-widest mb-0.5 relative z-10">Discounted</div>
            <div className="text-xl font-black text-slate-800 relative z-10">₹{discountAmountValue.toLocaleString()}</div>
          </div>
        ) : (
          <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-red-400 text-white flex items-center justify-center shadow-sm">
                <Receipt size={14} />
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-red-200 flex items-center justify-center text-red-400">
                <Clock size={12} strokeWidth={3} />
              </div>
            </div>
            <div className="text-[0.6rem] font-bold text-red-700/70 uppercase tracking-widest mb-0.5 relative z-10">Due Amount</div>
            <div className="text-xl font-black text-slate-800 relative z-10">₹{dueAmount.toLocaleString()}</div>
          </div>
        )}

        {/* Card 3: Mode of Payment */}
        <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-sm">
              <CreditCard size={14} />
            </div>
            <div className="w-5 h-5 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-300">
              <span className="text-base leading-none">-</span>
            </div>
          </div>
          <div className="text-[0.6rem] font-bold text-indigo-700/70 uppercase tracking-widest mb-0.5 relative z-10">Payment Method</div>
          <div className="text-xl font-black text-slate-800 relative z-10">{customData.paymentMode || "Not set"}</div>
        </div>
      </div>

      {order.transactions && order.transactions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3">Linked Transactions</div>
          <div className="space-y-2">
            {order.transactions.filter((tx) => !tx.deletedAt).map((tx) => (
              <button type="button" onClick={() => onOpenTransaction(tx.id)} key={tx.id} className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer block">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Receipt size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{tx.description || tx.category}</div>
                    <div className="text-[0.65rem] text-slate-500">{format(new Date(tx.date), "MMM dd, yyyy h:mm a")} • {tx.paymentMode || "Cash"}</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-green-600">+₹{tx.amount.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancialsCard({ editForm, setEditForm, ...summaryProps }: FinancialsCardProps) {
  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm flex flex-col h-full print-section col-span-1 lg:col-span-5">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Financials</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Overview of booking payments</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
            <CheckCircle2 size={14} />
            {summaryProps.totals.progressPercent}% Collected
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 mb-6 -mx-6"></div>

      {editForm ? (
        <FinancialsEditForm editForm={editForm} setEditForm={setEditForm} />
      ) : (
        <FinancialsSummary {...summaryProps} />
      )}
    </div>
  );
}
