"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import type { CreditPaymentInput, ProduceReceipt, ProduceSale } from "@/types/inventory";
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
import { useProduceBuyer } from "../useInventoryData";
import BuyerFormDialog from "./BuyerFormDialog";
import ProduceSaleFormDialog from "./ProduceSaleFormDialog";
import { HistoryTabs, ProduceSaleRow, ReceiptRow, formatQuantity } from "./produceShared";
import { cn } from "@/lib/utils";

function ReceiveForm({ buyerId, due, onDone }: { buyerId: string; due: number; onDone: () => void }) {
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
    else if (roundMoney(value) > roundMoney(due)) errs.amount = `Can't be more than the due (${formatINR(due)}).`;
    if (!date) errs.date = "Choose a date.";
    if (!mode) errs.mode = "Choose a payment mode.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: CreditPaymentInput = { amount: roundMoney(value), date, paymentMode: mode, notes: notes.trim() || undefined };
    setSaving(true);
    try {
      await sendJson(`/api/inventory/produce/buyers/${encodeURIComponent(buyerId)}/receipts`, "POST", body);
      toast.success(`${formatINR(body.amount)} received`, { description: "Posted to Daily Kanakku as Produce Sale Collection." });
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
        <i className="ph-bold ph-hand-coins text-emerald-600" aria-hidden="true" /> Receive payment
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="receipt-amount" className={labelClass}>Amount <RequiredMark /></label>
            <button type="button" onClick={() => setAmount(String(roundMoney(due)))} className="mb-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">
              Full due
            </button>
          </div>
          <MoneyInput id="receipt-amount" value={amount} onChange={(v) => setAmount(sanitizeDecimal(v, 2))} hasError={!!errors.amount} />
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
      <input aria-label="Receipt notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={inputClass} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} disabled={saving} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
        <button type="submit" disabled={saving} className={cn(primaryButtonClass, "h-10 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
          {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
          Save
        </button>
      </div>
    </form>
  );
}

type VoidTarget = { kind: "sale"; item: ProduceSale } | { kind: "receipt"; item: ProduceReceipt } | null;

/** A produce buyer: dues, sales, receipts, "Receive payment". Mount only while open. */
export default function BuyerDialog({ shopId, buyerId, onClose }: { shopId: string; buyerId: string; onClose: () => void }) {
  const { data, error, isLoading, mutate } = useProduceBuyer(buyerId);
  const revalidate = useRevalidateInventory();
  const canManage = useCanManageInventory();
  const [receiving, setReceiving] = useState(false);
  const [selling, setSelling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"sales" | "receipts">("sales");
  const [voidTarget, setVoidTarget] = useState<VoidTarget>(null);
  const [voiding, setVoiding] = useState(false);

  const buyer = data?.buyer;
  const due = data?.due ?? 0;
  const liveSales = (data?.sales ?? []).filter((s) => !s.voidedAt);
  const soldValue = roundMoney(liveSales.reduce((sum, s) => sum + s.totalAmount, 0));

  const doVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const url = voidTarget.kind === "sale"
        ? `/api/inventory/produce/sales/${encodeURIComponent(voidTarget.item.id)}/void`
        : `/api/inventory/produce/receipts/${encodeURIComponent(voidTarget.item.id)}/void`;
      await sendJson(url, "POST");
      toast.success(voidTarget.kind === "sale" ? `Sale ${voidTarget.item.saleNumber} voided` : "Receipt voided", {
        description: voidTarget.kind === "sale" ? "The produce is back in stock." : "The amount is back on the buyer's dues.",
      });
      setVoidTarget(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setVoiding(false);
    }
  };

  const contact = buyer ? [buyer.phone, buyer.place].filter(Boolean).join(" · ") : "";

  return (
    <InventoryDialog
      open
      onClose={onClose}
      size="lg"
      eyebrow="Produce · buyer"
      title={buyer?.name ?? "Loading…"}
      subtitle={buyer ? contact || "No contact details" : undefined}
      footer={
        buyer && canManage ? (
          <>
            <button type="button" onClick={() => setEditing(true)} className={cn(secondaryButtonClass, "sm:mr-auto")}>
              <i className="ph-bold ph-pencil-simple" /> Edit
            </button>
            <button type="button" onClick={() => setSelling(true)} className={secondaryButtonClass}>
              <i className="ph-bold ph-scales" /> Sell produce
            </button>
            {due > 0 && !receiving && (
              <button type="button" onClick={() => setReceiving(true)} className={cn(primaryButtonClass, "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
                <i className="ph-bold ph-hand-coins" /> Receive payment
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading || !data || !buyer ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <InfoTile label="Due" value={formatINR(due)} tone={due > 0 ? "red" : "green"} />
            <InfoTile label="Sales" value={liveSales.length} />
            <div className="col-span-2 sm:col-span-1">
              <InfoTile label="Total sold" value={formatINR(soldValue)} />
            </div>
          </div>

          {receiving && canManage && due > 0 && <ReceiveForm buyerId={buyer.id} due={due} onDone={() => setReceiving(false)} />}

          <div>
            <HistoryTabs
              value={tab}
              onChange={setTab}
              ariaLabel="Buyer history"
              tabs={[
                { id: "sales", label: `Sales (${data.sales.length})` },
                { id: "receipts", label: `Receipts (${data.receipts.length})` },
              ]}
            />
            {tab === "sales" ? (
              data.sales.length === 0 ? (
                <EmptyState icon="scales" title="No sales yet" message="Produce sold to this buyer will appear here." className="py-8" />
              ) : (
                <ul className="space-y-1">
                  {data.sales.map((s) => (
                    <li key={s.id}>
                      <ProduceSaleRow sale={s} showBuyer={false} onVoid={canManage ? () => setVoidTarget({ kind: "sale", item: s }) : undefined} />
                    </li>
                  ))}
                </ul>
              )
            ) : data.receipts.length === 0 ? (
              <EmptyState icon="hand-coins" title="No receipts yet" message="Money received later against this buyer's dues will appear here." className="py-8" />
            ) : (
              <ul className="space-y-1">
                {data.receipts.map((r) => (
                  <li key={r.id}>
                    <ReceiptRow receipt={r} onVoid={canManage ? () => setVoidTarget({ kind: "receipt", item: r }) : undefined} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {editing && buyer && <BuyerFormDialog shopId={shopId} buyer={buyer} onClose={() => setEditing(false)} />}
      {selling && buyer && <ProduceSaleFormDialog shopId={shopId} defaultBuyerId={buyer.id} onClose={() => setSelling(false)} />}
      <ConfirmDialog
        open={!!voidTarget}
        title={voidTarget?.kind === "sale" ? `Void sale ${voidTarget.item.saleNumber}?` : "Void this receipt?"}
        message={
          voidTarget?.kind === "sale" ? (
            <>
              {formatQuantity(voidTarget.item.quantity, voidTarget.item.item.unit)} of {voidTarget.item.item.name} goes back into stock
              {voidTarget.item.paidAmount > 0 && <>, its Produce Sales entry is removed from Daily Kanakku</>}
              {voidTarget.item.dueAmount > 0 && <> and {formatINR(voidTarget.item.dueAmount)} comes off the dues</>}.
            </>
          ) : voidTarget?.kind === "receipt" ? (
            <>{formatINR(voidTarget.item.amount)} goes back on {buyer?.name ?? "the buyer"}&apos;s dues and its entry is removed from Daily Kanakku.</>
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
