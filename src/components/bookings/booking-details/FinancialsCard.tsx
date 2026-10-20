"use client";

import { format } from "date-fns";
import { Receipt, Wallet, Clock, CheckCircle2, TrendingUp, Check, CreditCard } from "lucide-react";
import type { BookingDetail, BookingTransaction } from "@/types/bookings";
import { clickableProps } from "../clickableProps";

function SummaryTile({ tone, icon, badge, label, value, truncate }: {
  tone: { card: string; iconBox: string; badge: string; label: string };
  icon: React.ReactNode;
  badge: React.ReactNode;
  label: string;
  value: React.ReactNode;
  truncate?: boolean;
}) {
  return (
    <div className={`${tone.card} p-4 rounded-2xl border relative overflow-hidden group min-h-[100px] flex flex-col justify-between`}>
      <div className="flex items-center justify-between relative z-10">
        <div className={`w-10 h-10 rounded-xl ${tone.iconBox} text-white flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <div className={`w-6 h-6 rounded-full border-2 ${tone.badge} flex items-center justify-center`}>
          {badge}
        </div>
      </div>
      <div className="mt-4 relative z-10">
        <div className={`text-[11px] font-bold ${tone.label} uppercase tracking-wide mb-1`}>{label}</div>
        <div className={`text-2xl font-bold text-slate-800${truncate ? ' truncate' : ''}`}>{value}</div>
      </div>
    </div>
  );
}

/** Row 3 of the details view: payment totals and linked transactions. */
export default function FinancialsCard({ booking, onOpenTransaction }: { booking: BookingDetail; onOpenTransaction: (id: string) => void }) {
  const cd = booking.customData;
  const totalAmount = Number(booking.order?.package || cd?.fld_b_package || 0);
  const advanceAmount = Number(booking.order?.advance || cd?.fld_b_advance || 0);
  const dueAmount = totalAmount - advanceAmount;
  const progressPercent = totalAmount > 0 ? Math.round((advanceAmount / totalAmount) * 100) : 0;
  let validTransactions: BookingTransaction[] = booking.transactions?.filter(tx => !tx.deletedAt) || [];
  const paymentMethod = (cd?.paymentMode || cd?.fld_b_payment_mode || "Cash") as string;
  if (validTransactions.length === 0 && advanceAmount > 0) {
    validTransactions = [{
      id: 'legacy-advance-' + booking.id,
      amount: advanceAmount,
      date: booking.date || new Date().toISOString(),
      paymentMode: paymentMethod,
      description: 'Advance Payment (Legacy)',
      category: 'BOOKING'
    }];
  }

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col h-fit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#0B1E40]">Financials</h3>
            <p className="text-sm font-medium text-slate-500">Overview of booking payments</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
          <CheckCircle2 size={14} className="text-green-600" />
          <span className="text-[0.75rem] font-bold text-green-700">{progressPercent}% Collected</span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
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
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Collected ₹{advanceAmount.toLocaleString()}</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Pending ₹{dueAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <SummaryTile
              tone={{ card: 'bg-green-50/50 border-green-100', iconBox: 'bg-green-500', badge: 'border-green-200 text-green-400', label: 'text-green-700/70' }}
              icon={<Wallet size={16} />}
              badge={<Check size={14} strokeWidth={3} />}
              label="Advance Paid"
              value={`₹${advanceAmount.toLocaleString()}`}
            />
            <SummaryTile
              tone={{ card: 'bg-red-50/50 border-red-100', iconBox: 'bg-red-400', badge: 'border-red-200 text-red-400', label: 'text-red-700/70' }}
              icon={<Receipt size={16} />}
              badge={<Clock size={14} strokeWidth={3} />}
              label="Due Amount"
              value={`₹${dueAmount.toLocaleString()}`}
            />
            <SummaryTile
              tone={{ card: 'bg-indigo-50/50 border-indigo-100', iconBox: 'bg-indigo-500', badge: 'border-indigo-200 text-indigo-300', label: 'text-indigo-700/70' }}
              icon={<CreditCard size={16} />}
              badge={<span className="text-lg leading-none">-</span>}
              label="Payment Method"
              value={paymentMethod}
              truncate
            />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3">Linked Transactions</div>
            {validTransactions.length > 0 ? (
              <div className="space-y-3">
                {validTransactions.map(tx => (
                  <div
                    key={tx.id}
                    {...clickableProps(() => onOpenTransaction(tx.id))}
                    className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors block hover:bg-slate-100 cursor-pointer`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Receipt size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 mb-0.5">{tx.description || tx.category || "Advance Payment"}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{format(new Date(tx.date), "MMM dd, yyyy h:mm a")} • {tx.paymentMode || "Cash"}</div>
                      </div>
                    </div>
                    <div className="text-base font-bold text-green-600">+₹{tx.amount?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 border-dashed flex flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-slate-400">No linked transactions</p>
                <p className="text-[10px] text-slate-400 mt-1">Payments made towards this booking will appear here.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
