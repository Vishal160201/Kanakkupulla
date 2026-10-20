"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import type { ProduceBuyer, ProduceSale, ProduceSaleInput } from "@/types/inventory";
import { FieldError, InventoryDialog, MoneyInput, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
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
  useRevalidateInventory,
} from "../inventoryUtils";
import { useProduceBuyers, useProduceItems } from "../useInventoryData";
import { CropPicker, QuickAddParty, formatQuantity } from "./produceShared";
import { cn } from "@/lib/utils";

const NEW_BUYER = "__new__";

/** Sell produce to a buyer (quantity × rate; the unpaid part is their due). Mount only while open. */
export default function ProduceSaleFormDialog({ shopId, defaultBuyerId, onClose }: { shopId: string; defaultBuyerId?: string; onClose: () => void }) {
  const revalidate = useRevalidateInventory();
  const { data: itemData } = useProduceItems(shopId);
  const { data: buyerData, mutate: mutateBuyers } = useProduceBuyers(shopId);
  const items = useMemo(() => (itemData?.items ?? []).filter((i) => !i.isArchived), [itemData]);
  const inStock = items.filter((i) => i.stock > 0);

  const [itemId, setItemId] = useState("");
  // Preselect when only one crop has stock
  const effectiveItemId = itemId || (inStock.length === 1 ? inStock[0].id : "");
  const item = items.find((i) => i.id === effectiveItemId) ?? null;
  const unit = item?.unit ?? "kg";

  const [buyerId, setBuyerId] = useState(defaultBuyerId ?? "");
  const [date, setDate] = useState(todayISO());
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [paid, setPaid] = useState("");
  const [paidTouched, setPaidTouched] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<ProduceBuyer[]>([]);

  const buyers = useMemo(() => {
    const list = [...(buyerData?.buyers ?? [])];
    for (const b of created) if (!list.some((x) => x.id === b.id)) list.push(b);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [buyerData, created]);
  const selected = buyers.find((b) => b.id === buyerId) ?? null;

  const qtyNum = parseDecimal(quantity);
  const rateNum = parseDecimal(rate);
  const total = Number.isFinite(qtyNum) && Number.isFinite(rateNum) ? roundMoney(qtyNum * rateNum) : 0;
  const paidValue = paidTouched ? parseDecimal(paid) : total;
  const due = Number.isFinite(paidValue) ? roundMoney(Math.max(0, total - paidValue)) : 0;
  const stock = item?.stock ?? 0;
  const overStock = !!item && Number.isFinite(qtyNum) && qtyNum > stock + 0.0005;
  const stockMessage = item ? (stock > 0 ? `Only ${formatQuantity(stock, unit)} of ${item.name} in stock.` : `No ${item.name} in stock.`) : "";

  const buyerOptions: DropdownOption[] = [
    ...buyers.map((b) => ({ label: b.place ? `${b.name} · ${b.place}` : b.name, value: b.id, hint: b.due > 0 ? `Due ${formatINR(b.due)}` : undefined })),
    { label: "Add new buyer", value: NEW_BUYER, icon: "user-plus" },
  ];

  const onBuyer = (value: string) => {
    if (value === NEW_BUYER) {
      setAdding(true);
      return;
    }
    setBuyerId(value);
    setErrors((prev) => ({ ...prev, buyerId: "" }));
  };

  const addBuyer = async (party: { name: string; phone: string; place: string }) => {
    try {
      const res = await sendJson<{ buyer: ProduceBuyer }>("/api/inventory/produce/buyers", "POST", {
        shopId,
        name: party.name,
        phone: party.phone || undefined,
        place: party.place || undefined,
      });
      setCreated((prev) => [...prev, res.buyer]);
      setBuyerId(res.buyer.id);
      setAdding(false);
      setErrors((prev) => ({ ...prev, buyerId: "" }));
      toast.success(`${party.name} added`);
      void mutateBuyers();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!effectiveItemId) errs.itemId = "Choose the crop.";
    if (!buyerId) errs.buyerId = "Choose the buyer.";
    if (!date) errs.date = "Choose a date.";
    if (!quantity) errs.quantity = "Enter the quantity.";
    else if (!Number.isFinite(qtyNum) || qtyNum <= 0) errs.quantity = "Quantity must be more than 0.";
    else if (overStock) errs.quantity = stockMessage;
    if (!rate) errs.rate = `Enter the rate per ${unit}.`;
    else if (!Number.isFinite(rateNum) || rateNum <= 0) errs.rate = "Rate must be more than 0.";
    if (!Number.isFinite(paidValue) || paidValue < 0) errs.paidAmount = "Enter a valid amount.";
    else if (paidValue > total) errs.paidAmount = `Can't be more than the total (${formatINR(total)}).`;
    if (!paymentMode) errs.paymentMode = "Choose a payment mode.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: ProduceSaleInput = {
      shopId,
      itemId: effectiveItemId,
      buyerId,
      date,
      quantity: qtyNum,
      rate: rateNum,
      paidAmount: roundMoney(paidValue),
      paymentMode,
      notes: notes.trim() || undefined,
    };
    setSaving(true);
    try {
      const res = await sendJson<{ sale: ProduceSale }>("/api/inventory/produce/sales", "POST", body);
      toast.success(`Sale ${res.sale.saleNumber} saved`, {
        description: due > 0 && selected ? `${formatINR(due)} added to ${selected.name}'s dues.` : "Produce stock and Daily Kanakku updated.",
      });
      revalidate();
      onClose();
    } catch (err) {
      const details = errorDetails(err);
      if (details && typeof details === "object") setErrors(details as Record<string, string>);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <InventoryDialog
      open
      onClose={onClose}
      busy={saving}
      size="md"
      eyebrow="Produce sale"
      title="Sell produce to a buyer"
      subtitle="Stock of the crop goes down; what's paid now is posted to Daily Kanakku."
      footer={
        <>
          <div className="mr-auto flex flex-col justify-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">Total</span>
            <span className="text-xl font-black text-slate-900 leading-tight">{formatINR(total)}</span>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="produce-sale-form" disabled={saving} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            Save sale
          </button>
        </>
      }
    >
      <form
        id="produce-sale-form"
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-3">
          <div>
            <span className={labelClass}>Crop <RequiredMark /></span>
            <CropPicker
              shopId={shopId}
              items={items}
              value={effectiveItemId}
              onChange={(id) => { setItemId(id); setErrors((prev) => ({ ...prev, itemId: "", quantity: "" })); }}
              error={errors.itemId}
              allowAdd={false}
              hint={(i) => (i.stock > 0 ? formatQuantity(i.stock, i.unit) : "Out of stock")}
            />
          </div>
          <div>
            <span className={labelClass}>Date <RequiredMark /></span>
            <DatePickerInput value={date} onChange={setDate} hasError={!!errors.date} disableFutureDates />
            <FieldError message={errors.date} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className={labelClass}>Buyer <RequiredMark /></span>
            {!adding && (
              <button type="button" onClick={() => setAdding(true)} className="mb-2 text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                <i className="ph-bold ph-user-plus" /> New buyer
              </button>
            )}
          </div>
          <CustomDropdown options={buyerOptions} value={buyerId} onChange={onBuyer} error={!!errors.buyerId} placeholder="Choose buyer (marketer / trader)" />
          <FieldError message={errors.buyerId} />
        </div>

        {adding && <QuickAddParty title="New buyer" namePlaceholder="Marketer / trader name *" onCancel={() => setAdding(false)} onSave={addBuyer} />}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="produce-sale-qty" className={labelClass}>Quantity <RequiredMark /></label>
              {item && stock > 0 && (
                <button type="button" onClick={() => setQuantity(String(stock))} className="mb-2 text-[11px] font-bold text-orange-600 hover:text-orange-700 whitespace-nowrap">
                  All stock
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="produce-sale-qty"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={quantity}
                onChange={(e) => setQuantity(sanitizeDecimal(e.target.value))}
                placeholder="0"
                aria-invalid={!!errors.quantity || overStock || undefined}
                className={cn(inputClass, "pr-16", (errors.quantity || overStock) && inputErrorClass)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{unit}</span>
            </div>
            <FieldError message={errors.quantity || (overStock ? stockMessage : undefined)} />
            {item && !errors.quantity && !overStock && (
              <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatQuantity(stock, unit)} in stock</p>
            )}
          </div>
          <div>
            <label htmlFor="produce-sale-rate" className={labelClass}>Rate per {unit} <RequiredMark /></label>
            <MoneyInput id="produce-sale-rate" value={rate} onChange={(v) => setRate(sanitizeDecimal(v, 2))} hasError={!!errors.rate} placeholder="0.00" />
            <FieldError message={errors.rate} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="produce-sale-paid" className={labelClass}>Paid now <RequiredMark /></label>
              <div className="mb-2 flex gap-2 text-[11px] font-bold">
                <button type="button" onClick={() => { setPaidTouched(false); setPaid(""); }} className="text-slate-500 hover:text-orange-600">Full</button>
                <button type="button" onClick={() => { setPaidTouched(true); setPaid("0"); }} className="text-slate-500 hover:text-orange-600">Pay later</button>
              </div>
            </div>
            <MoneyInput
              id="produce-sale-paid"
              value={paidTouched ? paid : total ? String(total) : ""}
              onChange={(v) => { setPaidTouched(true); setPaid(sanitizeDecimal(v, 2)); setErrors((prev) => ({ ...prev, paidAmount: "" })); }}
              hasError={!!errors.paidAmount}
              placeholder="0"
            />
            <FieldError message={errors.paidAmount} />
          </div>
          <div>
            <span className={labelClass}>Payment mode <RequiredMark /></span>
            <CustomDropdown options={PAYMENT_MODE_OPTIONS} value={paymentMode} onChange={setPaymentMode} error={!!errors.paymentMode} placeholder="Payment mode" />
            <FieldError message={errors.paymentMode} />
          </div>
        </div>

        {due > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <i className="ph-bold ph-hand-coins text-lg mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-extrabold">{formatINR(due)}</span> will be added to {selected ? <span className="font-extrabold">{selected.name}</span> : "the buyer"}&apos;s dues
              {selected && selected.due > 0 && <> (now {formatINR(selected.due)}, after {formatINR(selected.due + due)})</>}.
            </div>
          </div>
        )}

        <div>
          <label htmlFor="produce-sale-notes" className={labelClass}>Notes</label>
          <input id="produce-sale-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Optional, e.g. lorry number, bags" className={inputClass} />
        </div>
      </form>
    </InventoryDialog>
  );
}
