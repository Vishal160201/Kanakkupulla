"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import Checkbox from "@/components/ui/Checkbox";
import type { ProduceCollection, ProducePayment, ProducePaymentInput } from "@/types/inventory";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FieldError,
  InfoTile,
  InventoryDialog,
  ListSkeleton,
  MoneyInput,
  RequiredMark,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../InventoryUI";
import {
  PAYMENT_MODE_OPTIONS,
  errorDetails,
  errorMessage,
  formatINR,
  parseDecimal,
  roundMoney,
  sanitizeDecimal,
  sendJson,
  todayISO,
  useCanManageInventory,
  useRevalidateInventory,
} from "../inventoryUtils";
import { useProduceFarmer } from "../useInventoryData";
import CustomerFormDialog from "../credit/CustomerFormDialog";
import CollectionFormDialog from "./CollectionFormDialog";
import { CollectionRow, FarmerPaymentRow, HistoryTabs, formatQuantity } from "./produceShared";
import { cn } from "@/lib/utils";

function SummaryLine({ label, value, tone, strong }: { label: string; value: string; tone?: "minus" | "result"; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm", strong ? "font-extrabold text-slate-900" : "font-semibold text-slate-600")}>
      <span className="min-w-0 truncate">{label}</span>
      <span className={cn("whitespace-nowrap", tone === "minus" && "text-rose-600", tone === "result" && "text-slate-900")}>{value}</span>
    </div>
  );
}

/** Pay a farmer for produce: cash plus (optionally) their fertilizer credit deducted. */
function PayFarmerForm({
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

type VoidTarget = { kind: "collection"; item: ProduceCollection } | { kind: "payment"; item: ProducePayment } | null;

/** A farmer's produce: what we owe (all crops), per-crop breakdown, fertilizer credit, history. Mount only while open. */
export default function FarmerProduceDialog({ shopId, customerId, onClose }: { shopId: string; customerId: string; onClose: () => void }) {
  const { data, error, isLoading, mutate } = useProduceFarmer(customerId);
  const revalidate = useRevalidateInventory();
  const canManage = useCanManageInventory();
  const [paying, setPaying] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"collections" | "payments">("collections");
  const [voidTarget, setVoidTarget] = useState<VoidTarget>(null);
  const [voiding, setVoiding] = useState(false);

  const farmer = data?.farmer;
  const produceDue = data?.produceDue ?? 0;

  const doVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const url = voidTarget.kind === "collection"
        ? `/api/inventory/produce/collections/${encodeURIComponent(voidTarget.item.id)}/void`
        : `/api/inventory/produce/payments/${encodeURIComponent(voidTarget.item.id)}/void`;
      await sendJson(url, "POST");
      toast.success(voidTarget.kind === "collection" ? "Collection voided" : "Payment voided", {
        description: voidTarget.kind === "collection" ? "Its amount no longer counts as owed." : "The amount is owed to the farmer again.",
      });
      setVoidTarget(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setVoiding(false);
    }
  };

  const contact = farmer ? [farmer.phone, farmer.place].filter(Boolean).join(" · ") : "";

  return (
    <InventoryDialog
      open
      onClose={onClose}
      size="lg"
      eyebrow="Produce · farmer"
      title={farmer?.name ?? "Loading…"}
      subtitle={farmer ? contact || "No contact details" : undefined}
      footer={
        farmer && canManage ? (
          <>
            <button type="button" onClick={() => setEditing(true)} className={cn(secondaryButtonClass, "sm:mr-auto")}>
              <i className="ph-bold ph-pencil-simple" /> Edit
            </button>
            <button type="button" onClick={() => setCollecting(true)} className={secondaryButtonClass}>
              <i className="ph-bold ph-basket" /> Collect produce
            </button>
            {produceDue > 0 && !paying && (
              <button type="button" onClick={() => setPaying(true)} className={cn(primaryButtonClass, "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
                <i className="ph-bold ph-hand-arrow-up" /> Pay farmer
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading || !data || !farmer ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <InfoTile label="You owe" value={formatINR(produceDue)} tone={produceDue > 0 ? "red" : "green"} />
            <InfoTile label="Fertilizer credit" value={formatINR(data.fertilizerCredit)} tone={data.fertilizerCredit > 0 ? "red" : undefined} />
            <div className="col-span-2 sm:col-span-1">
              <InfoTile label="Produce bought" value={formatINR(data.collectedAmount)} />
            </div>
          </div>

          {data.crops.length > 0 && (
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50 text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">By crop</div>
              <ul className="divide-y divide-slate-100">
                {data.crops.map((c) => (
                  <li key={c.itemId} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <i className="ph-bold ph-plant text-emerald-600 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-bold text-slate-900 truncate">{c.name}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0 text-sm">
                      <span className="font-semibold text-slate-500 whitespace-nowrap">{formatQuantity(c.quantity, c.unit)}</span>
                      <span className="font-extrabold text-slate-900 whitespace-nowrap">{formatINR(c.amount)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.maxCreditDeduction > 0 && !paying && (
            <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-xs sm:text-sm text-sky-800">
              <i className="ph-bold ph-info text-base mt-0.5" aria-hidden="true" />
              <span>
                Produce due {formatINR(produceDue)} − fertilizer credit {formatINR(data.maxCreditDeduction)} ={" "}
                <span className="font-extrabold">pay {formatINR(roundMoney(produceDue - data.maxCreditDeduction))}</span> to settle both.
              </span>
            </div>
          )}

          {paying && canManage && produceDue > 0 && (
            <PayFarmerForm
              customerId={farmer.id}
              name={farmer.name}
              produceDue={produceDue}
              fertilizerCredit={data.fertilizerCredit}
              maxDeduction={data.maxCreditDeduction}
              onDone={() => setPaying(false)}
            />
          )}

          <div>
            <HistoryTabs
              value={tab}
              onChange={setTab}
              ariaLabel="Farmer produce history"
              tabs={[
                { id: "collections", label: `Collections (${data.collections.length})` },
                { id: "payments", label: `Payments (${data.payments.length})` },
              ]}
            />
            {tab === "collections" ? (
              data.collections.length === 0 ? (
                <EmptyState icon="basket" title="No produce collected yet" message="Crops you buy from this farmer will appear here." className="py-8" />
              ) : (
                <ul className="space-y-1">
                  {data.collections.map((c) => (
                    <li key={c.id}>
                      <CollectionRow collection={c} showFarmer={false} onVoid={canManage ? () => setVoidTarget({ kind: "collection", item: c }) : undefined} />
                    </li>
                  ))}
                </ul>
              )
            ) : data.payments.length === 0 ? (
              <EmptyState icon="hand-arrow-up" title="No payments yet" message="Payments to this farmer for produce will appear here." className="py-8" />
            ) : (
              <ul className="space-y-1">
                {data.payments.map((p) => (
                  <li key={p.id}>
                    <FarmerPaymentRow payment={p} onVoid={canManage ? () => setVoidTarget({ kind: "payment", item: p }) : undefined} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {editing && farmer && (
        <CustomerFormDialog shopId={shopId} customer={{ ...farmer, balance: data?.fertilizerCredit ?? 0, lastActivity: null }} onClose={() => setEditing(false)} />
      )}
      {collecting && farmer && <CollectionFormDialog shopId={shopId} defaultCustomerId={farmer.id} onClose={() => setCollecting(false)} />}
      <ConfirmDialog
        open={!!voidTarget}
        title={voidTarget?.kind === "collection" ? "Void this collection?" : "Void this payment?"}
        message={
          voidTarget?.kind === "collection" ? (
            <>
              {formatQuantity(voidTarget.item.quantity, voidTarget.item.item.unit)} of {voidTarget.item.item.name} ({formatINR(voidTarget.item.amount)}) comes off what you owe{" "}
              {farmer?.name ?? "the farmer"} and out of stock.
            </>
          ) : voidTarget?.kind === "payment" ? (
            <>
              {formatINR(voidTarget.item.amount)} is owed to {farmer?.name ?? "the farmer"} again
              {voidTarget.item.cashAmount > 0 && <>, its Produce Payment entry is removed from Daily Kanakku</>}
              {voidTarget.item.creditDeducted > 0 && <> and {formatINR(voidTarget.item.creditDeducted)} goes back on their fertilizer credit</>}.
            </>
          ) : null
        }
        confirmLabel="Void"
        busyLabel="Voiding…"
        icon="prohibit"
        busy={voiding}
        onConfirm={() => void doVoid()}
        onCancel={() => setVoidTarget(null)}
      />
    </InventoryDialog>
  );
}
