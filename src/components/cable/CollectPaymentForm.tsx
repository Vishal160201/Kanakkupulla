"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { FieldError, MoneyInput, RequiredMark, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { PAYMENT_MODE_OPTIONS, errorMessage, formatINR, parseDecimal, roundMoney, sanitizeDecimal, sendJson, todayISO } from "@/components/inventory/inventoryUtils";
import { cn } from "@/lib/utils";
import { useRevalidateCable } from "./useCableData";

/** Money received from a subscriber: posted to Daily Kanakku as Internet Renewal. More than the due is kept as advance. */
export default function CollectPaymentForm({ subscriberId, due, onDone }: { subscriberId: string; due: number; onDone: (amount?: number) => void }) {
  const revalidate = useRevalidateCable();
  const [amount, setAmount] = useState(due > 0 ? String(roundMoney(due)) : "");
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value = parseDecimal(amount);
    const errs: Record<string, string> = {};
    if (!amount) errs.amount = "Enter the amount received.";
    else if (!Number.isFinite(value) || value <= 0) errs.amount = "Amount must be more than zero.";
    if (!date) errs.date = "Choose a date.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await sendJson(`/api/cable/subscribers/${encodeURIComponent(subscriberId)}/payments`, "POST", { amount: roundMoney(value), date, paymentMode: mode, notes: notes.trim() || undefined });
      toast.success(`${formatINR(value)} collected`, { description: "Posted to Daily Kanakku as Internet Renewal." });
      revalidate();
      onDone(roundMoney(value));
    } catch (err) {
      const message = errorMessage(err);
      setErrors({ amount: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      noValidate
      className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3 animate-slide-down"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
        <i className="ph-bold ph-hand-coins text-emerald-600" aria-hidden="true" /> Collect payment
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="cable-payment-amount" className={labelClass}>Amount <RequiredMark /></label>
          <MoneyInput id="cable-payment-amount" value={amount} onChange={(v) => setAmount(sanitizeDecimal(v, 2))} hasError={!!errors.amount} />
          <FieldError message={errors.amount} />
        </div>
        <div>
          <span className={labelClass}>Date <RequiredMark /></span>
          <DatePickerInput value={date} onChange={setDate} hasError={!!errors.date} disableFutureDates />
          <FieldError message={errors.date} />
        </div>
        <div>
          <span className={labelClass}>Mode <RequiredMark /></span>
          <CustomDropdown options={PAYMENT_MODE_OPTIONS} value={mode} onChange={setMode} />
        </div>
      </div>
      <input aria-label="Payment notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={inputClass} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onDone()} disabled={saving} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
        <button type="submit" disabled={saving} className={cn(primaryButtonClass, "h-10 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
          {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
          Save payment
        </button>
      </div>
    </form>
  );
}
