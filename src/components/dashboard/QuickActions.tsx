import React from 'react';
import { useGlobalForm } from '@/components/providers/GlobalFormProvider';
import { useActiveShopCan } from '@/hooks/useAccess';

export default function QuickActions() {
  const { openBookingForm, openTransactionForm } = useGlobalForm();
  const can = useActiveShopCan();

  const canManageBookings = can('bookings', 'MANAGE');
  // Ledger entries go to the active shop, so its Daily Kanakku level decides.
  const canManageTransactions = can('ledger', 'MANAGE');

  if (!canManageBookings && !canManageTransactions) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      <button
        type="button"
        onClick={() => openBookingForm()}
        className={`flex items-center gap-3 bg-[#1e2338] hover:bg-[#2a3048] text-white px-5 py-3 rounded-2xl shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 shrink-0 ${!canManageBookings ? 'hidden' : ''}`}
      >
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <i className="ph-bold ph-plus text-lg"></i>
        </div>
        <div className="flex flex-col items-start pr-2">
          <span className="text-[0.65rem] font-bold text-slate-300 capitalize tracking-wide">New</span>
          <span className="text-[1rem] font-extrabold leading-none tracking-tight">Booking</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => openTransactionForm(undefined, { type: 'EXPENSE' })}
        className={`flex items-center gap-3 bg-red-50 hover:bg-red-100 text-red-500 px-5 py-3 rounded-2xl border border-red-100 transition-all hover:-translate-y-0.5 hover:shadow-sm shrink-0 ${!canManageTransactions ? 'hidden' : ''}`}
      >
        <div className="w-9 h-9 flex items-center justify-center text-red-500">
          <i className="ph-bold ph-receipt text-[1.4rem]"></i>
        </div>
        <div className="flex flex-col items-start pr-2">
          <span className="text-[0.65rem] font-bold text-red-400 capitalize tracking-wide">Record</span>
          <span className="text-[1rem] font-extrabold leading-none tracking-tight">Expense</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => openTransactionForm(undefined, { type: 'INCOME' })}
        className={`flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-500 px-5 py-3 rounded-2xl border border-emerald-100 transition-all hover:-translate-y-0.5 hover:shadow-sm shrink-0 ${!canManageTransactions ? 'hidden' : ''}`}
      >
        <div className="w-9 h-9 flex items-center justify-center text-emerald-500">
          <i className="ph-bold ph-money text-[1.4rem]"></i>
        </div>
        <div className="flex flex-col items-start pr-2">
          <span className="text-[0.65rem] font-bold text-emerald-400 capitalize tracking-wide">Record</span>
          <span className="text-[1rem] font-extrabold leading-none tracking-tight">Income</span>
        </div>
      </button>
    </div>
  );
}
