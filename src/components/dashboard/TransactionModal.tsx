"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "@/components/ui/DatePickerInput";
import PillSelect from "@/components/ui/PillSelect";
import { toast } from "sonner";
import { TRANSACTION_CATEGORIES, PAYMENT_MODES } from "@/lib/transactionConstants";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pass a transaction object to enter edit mode */
  editTransaction?: {
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    date: string;
    category: string;
    paymentMode: string;
    description: string | null;
    status: string;
  } | null;
}

const categoryOptions = TRANSACTION_CATEGORIES.map((c) => ({ value: c, label: c }));
const paymentModeOptions = PAYMENT_MODES.map((m) => ({ value: m, label: m }));

const EMPTY_FORM = {
  amount: "",
  type: "INCOME" as "INCOME" | "EXPENSE",
  date: new Date().toISOString().split("T")[0],
  category: "Photography Session",
  paymentMode: "UPI",
  description: "",
  status: "SETTLED",
};

export default function TransactionModal({ isOpen, onClose, onSuccess, editTransaction }: TransactionModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!editTransaction;

  // F3: Sync form with editTransaction or reset to defaults each time the modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        setForm({
          amount: String(editTransaction.amount),
          type: editTransaction.type,
          date: new Date(editTransaction.date).toISOString().split("T")[0],
          category: editTransaction.category,
          paymentMode: editTransaction.paymentMode,
          description: editTransaction.description || "",
          status: editTransaction.status,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [isOpen, editTransaction]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // F1: Client-side validation
  const validate = () => {
    const errs: Record<string, string> = {};
    const parsed = parseFloat(form.amount);
    if (!form.amount || isNaN(parsed) || parsed <= 0) {
      errs.amount = "Enter a valid positive amount.";
    }
    if (!form.date) errs.date = "Select a date.";
    if (!form.category) errs.category = "Select a category.";
    if (!form.paymentMode) errs.paymentMode = "Select a payment mode.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const payload = {
      amount: parseFloat(form.amount),
      type: form.type,
      date: form.date,
      category: form.category,
      paymentMode: form.paymentMode,
      description: form.description,
      status: form.status,
    };

    try {
      let res: Response;
      if (isEditMode && editTransaction) {
        // A3: Edit mode — use PUT to [id] endpoint
        res = await fetch(`/api/transactions/${editTransaction.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        // U1: Success toast
        toast.success(isEditMode ? "Transaction updated!" : "Transaction recorded!", {
          description: `₹${parseFloat(form.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${form.type.toLowerCase()} on ${new Date(form.date).toLocaleDateString("en-IN")}`,
        });
        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && data.errors) {
          setErrors(data.errors);
          toast.error("Please fix the highlighted fields.");
        } else {
          toast.error(data.error || "Failed to save. Please try again.");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px] p-0 bg-white rounded-3xl border-0 shadow-2xl overflow-hidden !rounded-3xl">
        {/* Header */}
        <div className="px-8 pt-7 pb-5 bg-white border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[1px]">
                {isEditMode ? "Edit Record" : "New Record"}
              </span>
              <DialogTitle className="text-[1.5rem] font-extrabold text-slate-900 mt-0.5">
                {isEditMode ? "Edit Transaction" : "Add Transaction"}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 flex flex-col gap-5 max-h-[68vh] overflow-y-auto">

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm ${errors.amount ? "border-red-400" : "border-slate-200 focus-within:border-orange-400"}`}>
              <span className="text-2xl font-medium text-slate-400">₹</span>
              {/* U7: min="0" prevents negative amounts */}
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount")(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent border-none outline-none text-4xl font-extrabold text-slate-900 placeholder:text-slate-200"
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1 font-medium">{errors.amount}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Type</label>
            <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => set("type")("INCOME")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${form.type === "INCOME" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"}`}
              >
                <i className="ph ph-trend-up"></i> Income
              </button>
              <button
                type="button"
                onClick={() => set("type")("EXPENSE")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${form.type === "EXPENSE" ? "bg-rose-500 text-white shadow-md shadow-rose-500/30" : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"}`}
              >
                <i className="ph ph-trend-down"></i> Expense
              </button>
            </div>
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <DatePickerInput value={form.date} onChange={set("date")} />
              {errors.date && <p className="text-xs text-red-500 mt-1 font-medium">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Category</label>
              <PillSelect options={categoryOptions} value={form.category} onChange={set("category")} />
              {errors.category && <p className="text-xs text-red-500 mt-1 font-medium">{errors.category}</p>}
            </div>
          </div>

          {/* Payment Mode & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Payment Mode</label>
              <PillSelect options={paymentModeOptions} value={form.paymentMode} onChange={set("paymentMode")} />
              {errors.paymentMode && <p className="text-xs text-red-500 mt-1 font-medium">{errors.paymentMode}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Status</label>
              <PillSelect
                options={[{ value: "SETTLED", label: "Settled" }, { value: "PENDING", label: "Pending" }]}
                value={form.status}
                onChange={set("status")}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Notes (Optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              placeholder="Client name, session reference, invoice number..."
              className="w-full bg-white rounded-xl border border-slate-200 p-4 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all resize-none h-[90px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] py-3 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <><i className="ph ph-circle-notch animate-spin"></i> Saving...</>
            ) : (
              <><i className={`ph-bold ${isEditMode ? "ph-pencil-simple" : "ph-floppy-disk"}`}></i> {isEditMode ? "Save Changes" : "Save Transaction"}</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
