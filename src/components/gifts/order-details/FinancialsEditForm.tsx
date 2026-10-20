"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { GiftOrderEditForm } from "./useGiftOrderDetails";
import { PAYMENT_MODE_OPTIONS } from "./orderDetailsConstants";

interface FinancialsEditFormProps {
  editForm: GiftOrderEditForm;
  setEditForm: (form: GiftOrderEditForm) => void;
}

const LABEL = "text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block mb-1.5";

const paymentModeLabel = (mode: string) =>
  mode === 'BANK_TRANSFER' ? 'Bank Transfer' : mode === 'UPI' ? 'UPI' : mode.charAt(0) + mode.slice(1).toLowerCase();

export default function FinancialsEditForm({ editForm, setEditForm }: FinancialsEditFormProps) {
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-auto">
      <div>
        <label className={LABEL}>Total Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
          <input
            type="text"
            aria-label="Total Amount"
            value={editForm.amount}
            onChange={e => {
              const amtText = e.target.value.replace(/[^0-9]/g, '');
              const amt = Number(amtText) || 0;
              const adv = Number(editForm.advanceAmount) || 0;
              setEditForm({...editForm, amount: amtText, dueAmount: Math.max(0, amt - adv)});
            }}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-7 pr-3 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div>
        <label className={LABEL}>Advance Paid</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
          <input
            type="text"
            aria-label="Advance Paid"
            value={editForm.advanceAmount}
            onChange={e => {
              const advText = e.target.value.replace(/[^0-9]/g, '');
              const adv = Number(advText) || 0;
              const amt = Number(editForm.amount) || 0;
              setEditForm({...editForm, advanceAmount: advText, dueAmount: Math.max(0, amt - adv)});
            }}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-7 pr-3 py-2 text-green-600 font-bold focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div>
        <label className={LABEL}>Due Amount</label>
        <div className="relative flex items-center w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 h-[40px] md:h-[44px]">
          <span className="text-slate-400 font-bold text-sm mr-2">₹</span>
          <span className="text-red-500 font-bold text-lg">{editForm.dueAmount}</span>
        </div>
      </div>
      <div className="relative" ref={paymentDropdownRef}>
        <label className={LABEL}>Payment Method</label>
        <button
          type="button"
          aria-expanded={isPaymentDropdownOpen}
          onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
          className="flex h-[40px] md:h-[44px] w-full items-center justify-between bg-slate-50 border-2 border-slate-200 rounded-xl px-4 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors"
        >
          <span>{paymentModeLabel(editForm.paymentMode)}</span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isPaymentDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isPaymentDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-[fadeIn_0.15s_ease-out]">
            {PAYMENT_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setEditForm({ ...editForm, paymentMode: opt.value });
                  setIsPaymentDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-blue-50 hover:text-blue-700 ${editForm.paymentMode === opt.value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
