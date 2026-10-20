"use client";

// Building blocks shared by the Produce screens (crops bought from farmers, sold to buyers).

import React, { useState } from "react";
import { toast } from "sonner";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import { PRODUCE_UNITS, formatQuantity } from "@/lib/produceMath";
import type { ProduceCollection, ProduceItem, ProducePayment, ProduceReceipt, ProduceSale } from "@/types/inventory";
import { FieldError, Pill, inputClass, inputErrorClass, primaryButtonClass } from "../InventoryUI";
import { errorDetails, errorMessage, formatDate, formatINR, sendJson } from "../inventoryUtils";
import { validateParty } from "../farmers/FarmerFormDialog";
import { cn } from "@/lib/utils";

export { formatQuantity };

export const PRODUCE_UNIT_OPTIONS: DropdownOption[] = PRODUCE_UNITS.map((unit) => ({ label: unit, value: unit }));

/** A stored date as YYYY-MM-DD in local time (to compare with todayISO()). */
export function localISODate(value: string): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** Void action that stays visible on touch screens and appears on hover from lg up. */
export function VoidButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip content="Void">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
      >
        <i className="ph-bold ph-prohibit" />
      </button>
    </Tooltip>
  );
}

function RowShell({
  icon,
  iconClass,
  title,
  meta,
  amount,
  amountClass,
  badge,
  voided,
  onOpen,
  onVoid,
  voidLabel,
}: {
  icon: string;
  iconClass: string;
  title: React.ReactNode;
  meta: React.ReactNode;
  amount: string;
  amountClass?: string;
  badge?: React.ReactNode;
  voided: boolean;
  onOpen?: () => void;
  onVoid?: () => void;
  voidLabel: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", voided ? "bg-slate-100 text-slate-400" : iconClass)}>
          <i className={`ph-bold ph-${icon} text-lg`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className={cn("font-bold text-sm truncate", voided ? "text-slate-400 line-through" : "text-slate-900")}>{title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold text-slate-400 min-w-0">{meta}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div className="text-right">
          <div className={cn("text-sm font-extrabold whitespace-nowrap", voided ? "text-slate-400 line-through" : amountClass ?? "text-slate-900")}>{amount}</div>
          <div className="mt-0.5 flex justify-end">{voided ? <Pill tone="slate" icon="prohibit">Voided</Pill> : badge}</div>
        </div>
        {!voided && onVoid && <VoidButton label={voidLabel} onClick={onVoid} />}
      </div>
    </>
  );
  const className =
    "group w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50";
  return onOpen ? (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(className, "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300")}
    >
      {body}
    </div>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** "Maize · 120 kg @ ₹24/kg" */
const lineLabel = (item: { name: string; unit: string }, quantity: number, rate: number) =>
  `${item.name} · ${formatQuantity(quantity, item.unit)} @ ${formatINR(rate)}/${item.unit}`;

/** Produce bought from a farmer. */
export function CollectionRow({ collection, showFarmer = true, onOpen, onVoid }: { collection: ProduceCollection; showFarmer?: boolean; onOpen?: () => void; onVoid?: () => void }) {
  const line = lineLabel(collection.item, collection.quantity, collection.rate);
  return (
    <RowShell
      icon="basket"
      iconClass="bg-amber-50 text-amber-600"
      title={showFarmer ? collection.customer.name : line}
      meta={
        <>
          <span>{formatDate(collection.date)}</span>
          {showFarmer && <span className="min-w-0 truncate">&middot; {line}</span>}
          {showFarmer && collection.customer.place && <span className="hidden sm:inline">&middot; {collection.customer.place}</span>}
          {collection.notes && <span className="hidden sm:inline truncate max-w-[220px]">&middot; {collection.notes}</span>}
        </>
      }
      amount={formatINR(collection.amount)}
      voided={!!collection.voidedAt}
      onOpen={onOpen}
      onVoid={onVoid}
      voidLabel={`Void collection of ${formatQuantity(collection.quantity, collection.item.unit)} ${collection.item.name}`}
    />
  );
}

/** A payment to a farmer: cash plus any fertilizer credit deducted. */
export function FarmerPaymentRow({ payment, onVoid }: { payment: ProducePayment; onVoid?: () => void }) {
  return (
    <RowShell
      icon="hand-arrow-up"
      iconClass="bg-emerald-50 text-emerald-600"
      title={payment.cashAmount > 0 ? `${formatINR(payment.cashAmount)} by ${payment.paymentMode}` : "Fertilizer credit deducted"}
      meta={
        <>
          <span>{formatDate(payment.date)}</span>
          {payment.creditDeducted > 0 && payment.cashAmount > 0 && (
            <span className="whitespace-nowrap">&middot; + {formatINR(payment.creditDeducted)} credit deducted</span>
          )}
          {payment.notes && <span className="hidden sm:inline truncate max-w-[200px]">&middot; {payment.notes}</span>}
        </>
      }
      amount={formatINR(payment.amount)}
      amountClass="text-rose-600"
      badge={<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Settled</span>}
      voided={!!payment.voidedAt}
      onVoid={onVoid}
      voidLabel={`Void payment of ${formatINR(payment.amount)}`}
    />
  );
}

/** Produce sold to a buyer. */
export function ProduceSaleRow({ sale, showBuyer = true, onOpen, onVoid }: { sale: ProduceSale; showBuyer?: boolean; onOpen?: () => void; onVoid?: () => void }) {
  const line = lineLabel(sale.item, sale.quantity, sale.rate);
  return (
    <RowShell
      icon="scales"
      iconClass="bg-orange-50 text-orange-500"
      title={showBuyer ? sale.buyer.name : line}
      meta={
        <>
          <span className="font-mono text-slate-500">{sale.saleNumber}</span>
          <span>&middot; {formatDate(sale.date)}</span>
          {showBuyer && <span className="min-w-0 truncate">&middot; {line}</span>}
        </>
      }
      amount={formatINR(sale.totalAmount)}
      amountClass="text-emerald-600"
      badge={sale.dueAmount > 0 ? <Pill tone="red">Due {formatINR(sale.dueAmount)}</Pill> : <Pill tone="green">Paid</Pill>}
      voided={!!sale.voidedAt}
      onOpen={onOpen}
      onVoid={onVoid}
      voidLabel={`Void sale ${sale.saleNumber}`}
    />
  );
}

/** Money received from a buyer against their dues. */
export function ReceiptRow({ receipt, onVoid }: { receipt: ProduceReceipt; onVoid?: () => void }) {
  return (
    <RowShell
      icon="hand-coins"
      iconClass="bg-emerald-50 text-emerald-600"
      title={formatINR(receipt.amount)}
      meta={
        <>
          <span>{formatDate(receipt.date)}</span>
          <span>&middot; {receipt.paymentMode}</span>
          {receipt.notes && <span className="hidden sm:inline truncate max-w-[200px]">&middot; {receipt.notes}</span>}
        </>
      }
      amount={formatINR(receipt.amount)}
      amountClass="text-emerald-600"
      badge={<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Received</span>}
      voided={!!receipt.voidedAt}
      onVoid={onVoid}
      voidLabel={`Void receipt of ${formatINR(receipt.amount)}`}
    />
  );
}

/** Inline "add a farmer / buyer" mini-form used inside the collection and sale dialogs. */
export function QuickAddParty({
  title,
  namePlaceholder,
  onCancel,
  onSave,
}: {
  title: string;
  namePlaceholder: string;
  onCancel: () => void;
  /** Saves the party; throws to keep the form open (the caller shows the error). */
  onSave: (party: { name: string; phone: string; place: string }) => Promise<void>;
}) {
  const [party, setParty] = useState({ name: "", phone: "", place: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const errs = validateParty(party.name, party.phone);
    if (errs.name) errs.name = "Name is required.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await onSave({ name: party.name.trim(), phone: party.phone.trim(), place: party.place.trim() });
    } catch {
      // Error already shown; keep the form open.
    } finally {
      setSaving(false);
    }
  };
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    }
  };

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 space-y-3 animate-slide-down">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <i className="ph-bold ph-user-plus text-orange-500" /> {title}
        </span>
        <button type="button" aria-label={`Cancel ${title.toLowerCase()}`} onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-700">
          <i className="ph-bold ph-x text-xs" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <input
            aria-label="Name"
            autoFocus
            value={party.name}
            maxLength={100}
            onChange={(e) => setParty((p) => ({ ...p, name: e.target.value }))}
            onKeyDown={onEnter}
            placeholder={namePlaceholder}
            className={cn(inputClass, errors.name && inputErrorClass)}
          />
          <FieldError message={errors.name} />
        </div>
        <div>
          <input
            aria-label="Phone"
            type="tel"
            inputMode="tel"
            value={party.phone}
            maxLength={20}
            onChange={(e) => setParty((p) => ({ ...p, phone: e.target.value }))}
            onKeyDown={onEnter}
            placeholder="Phone"
            className={cn(inputClass, errors.phone && inputErrorClass)}
          />
          <FieldError message={errors.phone} />
        </div>
        <input
          aria-label="Village or place"
          value={party.place}
          maxLength={100}
          onChange={(e) => setParty((p) => ({ ...p, place: e.target.value }))}
          onKeyDown={onEnter}
          placeholder="Village / place"
          className={inputClass}
        />
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => void save()} disabled={saving} className={cn(primaryButtonClass, "h-10")}>
          {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
          Add
        </button>
      </div>
    </div>
  );
}

const NEW_CROP = "__new_crop__";

/**
 * Crop picker with an inline "Add new crop" form (name + unit). `hint` labels each option, e.g.
 * its stock. Calls onCreated after a crop is added so the caller can refresh its list.
 */
export function CropPicker({
  shopId,
  items,
  value,
  onChange,
  error,
  hint,
  allowAdd = true,
  onCreated,
}: {
  shopId: string;
  items: ProduceItem[];
  value: string;
  onChange: (itemId: string) => void;
  error?: string;
  hint?: (item: ProduceItem) => string | undefined;
  allowAdd?: boolean;
  onCreated?: (item: ProduceItem) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<string>("kg");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const options: DropdownOption[] = [
    ...items.map((item) => ({ label: `${item.name} (per ${item.unit})`, value: item.id, icon: "plant", hint: hint?.(item) })),
    ...(allowAdd ? [{ label: "Add new crop", value: NEW_CROP, icon: "plus" }] : []),
  ];

  const save = async () => {
    if (!name.trim()) {
      setNameError("Crop name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await sendJson<{ item: ProduceItem }>("/api/inventory/produce/items", "POST", { shopId, name: name.trim(), unit });
      toast.success(`${res.item.name} added to your crops`);
      onCreated?.(res.item);
      onChange(res.item.id);
      setAdding(false);
      setName("");
      setNameError("");
    } catch (err) {
      const details = errorDetails(err) as Record<string, string> | undefined;
      setNameError(details?.name ?? errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <CustomDropdown
        options={options}
        value={value}
        onChange={(v) => (v === NEW_CROP ? setAdding(true) : onChange(v))}
        error={!!error}
        placeholder={items.length === 0 ? "Add your first crop" : "Choose crop"}
      />
      <FieldError message={error} />
      {adding && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2 animate-slide-down">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <i className="ph-bold ph-plant text-emerald-600" aria-hidden="true" /> New crop
            </span>
            <button type="button" aria-label="Cancel new crop" onClick={() => setAdding(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-700">
              <i className="ph-bold ph-x text-xs" />
            </button>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <div>
              <input
                aria-label="Crop name"
                autoFocus
                value={name}
                maxLength={60}
                onChange={(e) => { setName(e.target.value); setNameError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
                placeholder="e.g. Maize, Paddy"
                className={cn(inputClass, nameError && inputErrorClass)}
              />
              <FieldError message={nameError} />
            </div>
            <CustomDropdown options={PRODUCE_UNIT_OPTIONS} value={unit} onChange={setUnit} placeholder="Unit" />
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => void save()} disabled={saving} className={cn(primaryButtonClass, "h-10 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
              {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
              Add crop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Two-way history switch used in the farmer and buyer dialogs. */
export function HistoryTabs<T extends string>({ value, onChange, tabs, ariaLabel }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string }[]; ariaLabel: string }) {
  return (
    <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-10 mb-3 w-full sm:w-auto sm:inline-flex" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn("flex-1 sm:flex-none px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap", value === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
