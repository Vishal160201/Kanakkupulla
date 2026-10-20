"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import Checkbox from "@/components/ui/Checkbox";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CreditPayment, CreditPaymentInput, ProducePaymentInput } from "@/types/inventory";
import { FieldError, MoneyInput, Pill, RequiredMark, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import {
  PAYMENT_MODE_OPTIONS,
  errorDetails,
  errorMessage,
  formatDate,
  formatINR,
  parseDecimal,
  roundMoney,
  sanitizeDecimal,
  sendJson,
  todayISO,
  useRevalidateInventory,
} from "../inventoryUtils";
import { cn } from "@/lib/utils";

// Forms and rows of the farmer detail dialog: fertilizer credit repayments (money in) and
// produce payments (money out, optionally settling their fertilizer credit).

/** Farmer pays back fertilizer credit: posted to Daily Kanakku as Credit Collection. */
export function RecordRepaymentForm({ customerId, balance, onDone }: { customerId: string; balance: number; onDone: () => void }) {
  const revalidate = useRevalidateInventory();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState<string>("Cash");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value = parseDecimal(amount);
    const errs: Record<string, string> = {};
    if (!amount) errs.amount = "Enter the amount received.";
    else if (!Number.isFinite(value) || value <= 0) errs.amount = "Amount must be more than zero.";
    else if (roundMoney(value) > roundMoney(balance)) errs.amount = `Can't be more than the balance (${formatINR(balance)}).`;
    if (!date) errs.date = "Choose a date.";
    if (!mode) errs.mode = "Choose a payment mode.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: CreditPaymentInput = { amount: roundMoney(value), date, paymentMode: mode, notes: notes.trim() || undefined };
    setSaving(true);
    try {
      await sendJson(`/api/inventory/customers/${encodeURIComponent(customerId)}/payments`, "POST", body);
      toast.success(`Payment of ${formatINR(body.amount)} recorded`, { description: "Posted to Daily Kanakku as Credit Collection." });
      revalidate();
      onDone();
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
        <i className="ph-bold ph-hand-coins text-emerald-600" aria-hidden="true" /> Record repayment
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="payment-amount" className={labelClass}>Amount <RequiredMark /></label>
            <button type="button" onClick={() => setAmount(String(roundMoney(balance)))} className="mb-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">
              Full balance
            </button>
          </div>
          <MoneyInput id="payment-amount" value={amount} onChange={(v) => setAmount(sanitizeDecimal(v, 2))} hasError={!!errors.amount} />
          <FieldError message={errors.amount} />
        </div>
        <div>
          <span className={labelClass}>Date <RequiredMark /></span>
          <DatePickerInput value={date} onChange={setDate} hasError={!!errors.date} disableFutureDates />
          <FieldError message={errors.date} />
        </div>
        <div>
          <span className={labelClass}>Mode <RequiredMark /></span>
          <CustomDropdown options={PAYMENT_MODE_OPTIONS} value={mode} onChange={setMode} error={!!errors.mode} />
          <FieldError message={errors.mode} />
        </div>
      </div>
      <input aria-label="Payment notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={inputClass} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} disabled={saving} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
        <button type="submit" disabled={saving} className={cn(primaryButtonClass, "h-10 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
          {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
          Save payment
        </button>
      </div>
    </form>
  );
}

/** A fertilizer credit repayment in the farmer's history. */
export function CreditPaymentRow({ payment, onVoid }: { payment: CreditPayment; onVoid?: (p: CreditPayment) => void }) {
  const voided = !!payment.voidedAt;
  return (
    <li className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", voided ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600")}>
          <i className="ph-bold ph-hand-coins" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className={cn("text-sm font-bold", voided ? "text-slate-400 line-through" : "text-slate-900")}>{formatINR(payment.amount)}</div>
          <div className="text-[11px] font-semibold text-slate-400 truncate">
            {formatDate(payment.date)} &middot; {payment.paymentMode}
            {payment.notes && <> &middot; {payment.notes}</>}
          </div>
        </div>
      </div>
      {voided ? (
        <Pill tone="slate" icon="prohibit">Voided</Pill>
      ) : payment.fromProducePayment ? (
        <Tooltip content="Deducted from a produce payment. Void that produce payment to undo it.">
          <span><Pill tone="amber" icon="scales">Produce</Pill></span>
        </Tooltip>
      ) : onVoid && (
        <Tooltip content="Void payment">
          <button
            type="button"
            aria-label={`Void payment of ${formatINR(payment.amount)}`}
            onClick={() => onVoid(payment)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <i className="ph-bold ph-prohibit" />
          </button>
        </Tooltip>
      )}
    </li>
  );
}

function SummaryLine({ label, value, tone, strong }: { label: string; value: string; tone?: "minus" | "result"; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm", strong ? "font-extrabold text-slate-900" : "font-semibold text-slate-600")}>
      <span className="min-w-0 truncate">{label}</span>
      <span className={cn("whitespace-nowrap", tone === "minus" && "text-rose-600", tone === "result" && "text-slate-900")}>{value}</span>
    </div>
  );
}

/** Pay a farmer for produce: cash plus (optionally) their fertilizer credit deducted. */
export function PayFarmerForm({
  customerId,
  name,
  produceDue,
  fertilizerCredit,
  maxDeduction,
  onDone,
}: {
  customerId: string;
  name: string;
  produceDue: number;
  fertilizerCredit: number;
  maxDeduction: number;
  onDone: () => void;
}) {
  const revalidate = useRevalidateInventory();
  const canDeduct = maxDeduction > 0;
  const [deduct, setDeduct] = useState(canDeduct);
  const [deductAmount, setDeductAmount] = useState(canDeduct ? String(maxDeduction) : "");
  const [cash, setCash] = useState(String(roundMoney(produceDue - (canDeduct ? maxDeduction : 0))));
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState<string>("Cash");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const deductValue = deduct ? parseDecimal(deductAmount) : 0;
  const cashValue = parseDecimal(cash);
  const safeDeduct = Number.isFinite(deductValue) ? deductValue : 0;
  const safeCash = Number.isFinite(cashValue) ? cashValue : 0;
  const stillOwed = roundMoney(produceDue - safeDeduct - safeCash);

  const toggleDeduct = (on: boolean) => {
    setDeduct(on);
    setDeductAmount(on ? String(maxDeduction) : "");
    // Default to settling the whole due
    setCash(String(roundMoney(Math.max(0, produceDue - (on ? maxDeduction : 0)))));
    setErrors({});
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (deduct) {
      if (!deductAmount) errs.creditDeducted = "Enter the credit to deduct.";
      else if (!Number.isFinite(deductValue) || deductValue < 0) errs.creditDeducted = "Enter a valid amount.";
      else if (roundMoney(deductValue) > maxDeduction) errs.creditDeducted = `Can't be more than ${formatINR(maxDeduction)}.`;
    }
    if (!cash) errs.cashAmount = "Enter the cash paid (0 if none).";
    else if (!Number.isFinite(cashValue) || cashValue < 0) errs.cashAmount = "Enter a valid amount.";
    if (Object.keys(errs).length === 0) {
      if (roundMoney(safeCash + safeDeduct) <= 0) errs.cashAmount = "Enter an amount to pay.";
      else if (roundMoney(safeCash + safeDeduct) > roundMoney(produceDue)) errs.cashAmount = `Cash and deduction can't be more than ${formatINR(produceDue)}.`;
    }
    if (!date) errs.date = "Choose a date.";
    if (!mode) errs.mode = "Choose a payment mode.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: ProducePaymentInput = {
      cashAmount: roundMoney(safeCash),
      creditDeducted: roundMoney(safeDeduct),
      date,
      paymentMode: mode,
      notes: notes.trim() || undefined,
    };
    setSaving(true);
    try {
      await sendJson(`/api/inventory/produce/farmers/${encodeURIComponent(customerId)}/payments`, "POST", body);
      toast.success(`Paid ${name} ${formatINR(body.cashAmount + (body.creditDeducted ?? 0))}`, {
        description: [
          body.cashAmount > 0 ? `${formatINR(body.cashAmount)} posted to Daily Kanakku as Produce Payment.` : null,
          body.creditDeducted ? `${formatINR(body.creditDeducted)} fertilizer credit settled.` : null,
        ]
          .filter(Boolean)
          .join(" "),
      });
      revalidate();
      onDone();
    } catch (err) {
      const details = errorDetails(err);
      if (details && typeof details === "object") setErrors(details as Record<string, string>);
      toast.error(errorMessage(err));
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
        <i className="ph-bold ph-hand-arrow-up text-emerald-600" aria-hidden="true" /> Pay for produce
      </div>

      {canDeduct ? (
        <div className="rounded-xl border border-sky-100 bg-white px-3 py-3 space-y-2.5">
          <Checkbox
            checked={deduct}
            onChange={toggleDeduct}
            tone="blue"
            label={
              <span className="text-sm font-bold text-slate-800">
                Deduct fertilizer credit <span className="font-semibold text-slate-500">(owes {formatINR(fertilizerCredit)})</span>
              </span>
            }
          />
          {deduct && (
            <div className="sm:max-w-[220px]">
              <label htmlFor="deduct-amount" className={labelClass}>Credit to deduct</label>
              <MoneyInput
                id="deduct-amount"
                value={deductAmount}
                onChange={(v) => {
                  setDeductAmount(sanitizeDecimal(v, 2));
                  setErrors((prev) => ({ ...prev, creditDeducted: "" }));
                }}
                hasError={!!errors.creditDeducted}
              />
              <FieldError message={errors.creditDeducted} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs font-medium text-slate-500">{name} has no fertilizer credit to deduct.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="produce-cash" className={labelClass}>Cash paid <RequiredMark /></label>
            <button
              type="button"
              onClick={() => setCash(String(roundMoney(Math.max(0, produceDue - safeDeduct))))}
              className="mb-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
            >
              Pay all
            </button>
          </div>
          <MoneyInput id="produce-cash" value={cash} onChange={(v) => { setCash(sanitizeDecimal(v, 2)); setErrors((prev) => ({ ...prev, cashAmount: "" })); }} hasError={!!errors.cashAmount} />
          <FieldError message={errors.cashAmount} />
        </div>
        <div>
          <span className={labelClass}>Date <RequiredMark /></span>
          <DatePickerInput value={date} onChange={setDate} hasError={!!errors.date} disableFutureDates />
          <FieldError message={errors.date} />
        </div>
        <div>
          <span className={labelClass}>Mode <RequiredMark /></span>
          <CustomDropdown options={PAYMENT_MODE_OPTIONS} value={mode} onChange={setMode} error={!!errors.mode} />
          <FieldError message={errors.mode} />
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-100 px-3.5 py-3 space-y-1.5">
        <SummaryLine label="Produce due" value={formatINR(produceDue)} />
        {deduct && safeDeduct > 0 && <SummaryLine label="Fertilizer credit deducted" value={`- ${formatINR(safeDeduct)}`} tone="minus" />}
        <SummaryLine label="Cash paid now" value={`- ${formatINR(safeCash)}`} tone="minus" />
        <div className="border-t border-dashed border-slate-200 pt-1.5 space-y-1.5">
          <SummaryLine label="Still owed to farmer" value={formatINR(Math.max(0, stillOwed))} tone="result" strong />
          {deduct && safeDeduct > 0 && <SummaryLine label="Fertilizer credit left" value={formatINR(roundMoney(Math.max(0, fertilizerCredit - safeDeduct)))} />}
        </div>
      </div>

      <input aria-label="Payment notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={inputClass} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} disabled={saving} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
        <button type="submit" disabled={saving} className={cn(primaryButtonClass, "h-10 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
          {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
          Save payment
        </button>
      </div>
    </form>
  );
}
