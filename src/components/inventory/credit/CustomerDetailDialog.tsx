"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CreditPayment, CreditPaymentInput } from "@/types/inventory";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FieldError,
  InfoTile,
  InventoryDialog,
  ListSkeleton,
  MoneyInput,
  Pill,
  RequiredMark,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../InventoryUI";
import {
  PAYMENT_MODE_OPTIONS,
  errorMessage,
  formatDate,
  formatINR,
  parseDecimal,
  roundMoney,
  sanitizeDecimal,
  sendJson,
  todayISO,
  useCanManageInventory,
  useRevalidateInventory,
} from "../inventoryUtils";
import { useCreditCustomer } from "../useInventoryData";
import BillRow from "../bills/BillRow";
import BillDetailDialog from "../bills/BillDetailDialog";
import BillFormDialog from "../bills/BillFormDialog";
import CustomerFormDialog from "./CustomerFormDialog";
import { cn } from "@/lib/utils";

interface CustomerDetailDialogProps {
  shopId: string;
  customerId: string;
  onClose: () => void;
}

function RecordPaymentForm({ customerId, balance, onDone }: { customerId: string; balance: number; onDone: () => void }) {
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
        <i className="ph-bold ph-hand-coins text-emerald-600" aria-hidden="true" /> Record payment
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

function PaymentRow({ payment, onVoid }: { payment: CreditPayment; onVoid?: (p: CreditPayment) => void }) {
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
        <Tooltip content="Deducted from a produce payment. Void that payment in Produce.">
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

/** A credit customer: contact, balance, sales, repayments, "Record payment". Mount only while open. */
export default function CustomerDetailDialog({ shopId, customerId, onClose }: CustomerDetailDialogProps) {
  const { data, error, isLoading, mutate } = useCreditCustomer(customerId);
  const revalidate = useRevalidateInventory();
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selling, setSelling] = useState(false);
  const [tab, setTab] = useState<"bills" | "payments">("bills");
  const [openBillId, setOpenBillId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<CreditPayment | null>(null);
  const [voiding, setVoiding] = useState(false);
  const canManage = useCanManageInventory();

  const customer = data?.customer;
  const balance = data?.balance ?? customer?.balance ?? 0;
  const bills = data?.bills ?? [];
  const payments = data?.payments ?? [];

  const voidPayment = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      await sendJson(`/api/inventory/payments/${encodeURIComponent(voidTarget.id)}/void`, "POST");
      toast.success(`Payment of ${formatINR(voidTarget.amount)} voided`, { description: "The amount is back on the customer's balance." });
      setVoidTarget(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setVoiding(false);
    }
  };

  const contact = customer ? [customer.phone, customer.place].filter(Boolean).join(" · ") : "";

  return (
    <InventoryDialog
      open
      onClose={onClose}
      size="lg"
      eyebrow="Credit customer"
      title={customer?.name ?? "Loading…"}
      subtitle={
        customer ? (
          contact ? (
            <span className="inline-flex items-center gap-1.5">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 font-bold text-sky-700 hover:underline">
                  <i className="ph-bold ph-phone" aria-hidden="true" />
                  {customer.phone}
                </a>
              )}
              {customer.phone && customer.place && <span>&middot;</span>}
              {customer.place && <span className="inline-flex items-center gap-1"><i className="ph-bold ph-map-pin" aria-hidden="true" />{customer.place}</span>}
            </span>
          ) : (
            "No contact details"
          )
        ) : undefined
      }
      footer={
        customer && canManage ? (
          <>
            <button type="button" onClick={() => setEditing(true)} className={cn(secondaryButtonClass, "sm:mr-auto")}>
              <i className="ph-bold ph-pencil-simple" /> Edit
            </button>
            <button type="button" onClick={() => setSelling(true)} className={secondaryButtonClass}>
              <i className="ph-bold ph-shopping-cart" /> New sale
            </button>
            {balance > 0 && !recording && (
              <button type="button" onClick={() => setRecording(true)} className={cn(primaryButtonClass, "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
                <i className="ph-bold ph-hand-coins" /> Record payment
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading || !customer ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <InfoTile label="Balance due" value={formatINR(balance)} tone={balance > 0 ? "red" : "green"} />
            <InfoTile label="Credit bills" value={bills.filter((b) => !b.voidedAt && b.dueAmount > 0).length} />
            <InfoTile label="Last activity" value={formatDate(customer.lastActivity)} />
          </div>

          {recording && canManage && balance > 0 && <RecordPaymentForm customerId={customer.id} balance={balance} onDone={() => setRecording(false)} />}

          <div>
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-10 mb-3 w-full sm:w-auto sm:inline-flex" role="tablist" aria-label="Customer history">
              {(["bills", "payments"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn("flex-1 sm:flex-none px-4 rounded-lg text-sm font-bold transition-all", tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                >
                  {t === "bills" ? `Sales (${bills.length})` : `Payments (${payments.length})`}
                </button>
              ))}
            </div>
            {tab === "bills" ? (
              bills.length === 0 ? (
                <EmptyState icon="receipt" title="No sales yet" message="Sales billed to this customer will appear here." className="py-8" />
              ) : (
                <ul className="space-y-1">
                  {bills.map((bill) => (
                    <li key={bill.id}><BillRow bill={bill} onOpen={setOpenBillId} /></li>
                  ))}
                </ul>
              )
            ) : payments.length === 0 ? (
              <EmptyState icon="hand-coins" title="No payments yet" message="Repayments against this customer's credit will appear here." className="py-8" />
            ) : (
              <ul className="rounded-2xl border border-slate-100 divide-y divide-slate-100">
                {payments.map((p) => (
                  <PaymentRow key={p.id} payment={p} onVoid={canManage ? setVoidTarget : undefined} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {editing && customer && <CustomerFormDialog shopId={shopId} customer={customer} onClose={() => setEditing(false)} />}
      {selling && customer && <BillFormDialog shopId={shopId} kind="SALE" defaultCustomerId={customer.id} onClose={() => setSelling(false)} />}
      {openBillId && <BillDetailDialog billId={openBillId} onClose={() => setOpenBillId(null)} />}
      <ConfirmDialog
        open={!!voidTarget}
        title="Void this payment?"
        message={
          <>
            {voidTarget ? formatINR(voidTarget.amount) : "The amount"} goes back on {customer?.name ?? "the customer"}&apos;s balance and its Credit Collection entry is removed from Daily Kanakku.
          </>
        }
        confirmLabel="Void payment"
        busyLabel="Voiding…"
        icon="prohibit"
        busy={voiding}
        onConfirm={() => void voidPayment()}
        onCancel={() => setVoidTarget(null)}
      />
    </InventoryDialog>
  );
}
