"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePickerInput from "@/components/ui/DatePickerInput";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionModal({ isOpen, onClose, onSuccess }: TransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Photography Session");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async () => {
    if (!amount) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type,
          date,
          category,
          paymentMode,
          description
        })
      });
      if (res.ok) {
        setAmount("");
        setDescription("");
        onSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-slate-50 w-full max-w-lg rounded-[24px] shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex justify-between items-start bg-white rounded-t-[24px]">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Add New Transaction</h2>
            <p className="text-sm font-medium text-slate-500">Record studio activity to your digital ledger</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors">
            <i className="ph ph-x"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col gap-6">
          
          {/* Amount */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Transaction Amount</label>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm">
              <span className="text-2xl font-medium text-slate-400">₹</span>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" 
                className="w-full bg-transparent border-none outline-none text-4xl font-extrabold text-slate-900 placeholder:text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Type</label>
              <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                <button 
                  onClick={() => setType("INCOME")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${type === 'INCOME' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                >
                  <i className="ph ph-plus-circle"></i> Income
                </button>
                <button 
                  onClick={() => setType("EXPENSE")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
                >
                  <i className="ph ph-minus-circle"></i> Expense
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Date</label>
              <DatePickerInput
                value={date}
                onChange={(val) => setDate(val)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Category</label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val || "Misc")}
                options={["Photography Session", "Equipment", "Utilities", "Rent", "Misc"]}
                className="w-full h-[45px] rounded-xl border border-slate-200 bg-white shadow-sm font-bold text-sm text-slate-700 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Payment Mode</label>
              <CustomSelect
                value={paymentMode}
                onChange={(val) => setPaymentMode(val || "UPI")}
                options={["UPI", "Cash", "Bank Transfer"]}
                className="w-full h-[45px] rounded-xl border border-slate-200 bg-white shadow-sm font-bold text-sm text-slate-700 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Description / Notes</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add internal session notes or client reference numbers..."
              className="w-full bg-white rounded-xl border border-slate-200 p-4 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all resize-none h-[100px]"
            ></textarea>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-white border-t border-slate-100 flex gap-4 rounded-b-[24px]">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] py-3.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : <><i className="ph-bold ph-floppy-disk"></i> Save Transaction</>}
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
