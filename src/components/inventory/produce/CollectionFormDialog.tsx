"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import type { CreditCustomer, ProduceCollectionInput, ProduceFarmer } from "@/types/inventory";
import { FieldError, InventoryDialog, MoneyInput, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { errorDetails, errorMessage, formatINR, parseDecimal, roundMoney, sanitizeDecimal, sendJson, todayISO, useRevalidateInventory } from "../inventoryUtils";
import { useProduceCollections, useProduceFarmers, useProduceItems } from "../useInventoryData";
import { CropPicker, QuickAddParty, formatQuantity, localISODate } from "./produceShared";
import { cn } from "@/lib/utils";

const NEW_FARMER = "__new__";

/** Record produce bought from a farmer (quantity at the day's rate). Mount only while open. */
export default function CollectionFormDialog({ shopId, defaultCustomerId, onClose }: { shopId: string; defaultCustomerId?: string; onClose: () => void }) {
  const revalidate = useRevalidateInventory();
  const { data: itemData, mutate: mutateItems } = useProduceItems(shopId);
  const { data: farmerData, mutate: mutateFarmers } = useProduceFarmers(shopId);
  const items = useMemo(() => (itemData?.items ?? []).filter((i) => !i.isArchived), [itemData]);

  const [itemId, setItemId] = useState("");
  // With a single crop there's nothing to choose
  const effectiveItemId = itemId || (items.length === 1 ? items[0].id : "");
  const item = items.find((i) => i.id === effectiveItemId) ?? null;

  // The latest collection of this crop today suggests the rate (rates usually hold all day).
  const { data: recent } = useProduceCollections(effectiveItemId ? shopId : null, 1, "", effectiveItemId);
  const today = todayISO();
  const lastToday = recent?.collections.find((c) => !c.voidedAt && c.item.id === effectiveItemId && localISODate(c.date) === today);

  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [date, setDate] = useState(today);
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [rateTouched, setRateTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<ProduceFarmer[]>([]);

  const farmers = useMemo(() => {
    const list = [...(farmerData?.farmers ?? [])];
    for (const f of created) if (!list.some((x) => x.id === f.id)) list.push(f);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [farmerData, created]);
  const selected = farmers.find((f) => f.id === customerId) ?? null;

  const shownRate = rateTouched ? rate : lastToday ? String(lastToday.rate) : rate;
  const qtyNum = parseDecimal(quantity);
  const rateNum = parseDecimal(shownRate);
  const amount = Number.isFinite(qtyNum) && Number.isFinite(rateNum) ? roundMoney(qtyNum * rateNum) : 0;
  const unit = item?.unit ?? "kg";

  const farmerOptions: DropdownOption[] = [
    ...farmers.map((f) => ({ label: f.place ? `${f.name} · ${f.place}` : f.name, value: f.id, hint: f.produceDue > 0 ? `Owed ${formatINR(f.produceDue)}` : undefined })),
    { label: "Add new farmer", value: NEW_FARMER, icon: "user-plus" },
  ];

  const changeItem = (id: string) => {
    setItemId(id);
    setRateTouched(false);
    setRate("");
    setErrors((prev) => ({ ...prev, itemId: "" }));
  };

  const onFarmer = (value: string) => {
    if (value === NEW_FARMER) {
      setAdding(true);
      return;
    }
    setCustomerId(value);
    setErrors((prev) => ({ ...prev, customerId: "" }));
  };

  const addFarmer = async (party: { name: string; phone: string; place: string }) => {
    try {
      const res = await sendJson<{ customer: CreditCustomer }>("/api/inventory/customers", "POST", {
        shopId,
        name: party.name,
        phone: party.phone || undefined,
        place: party.place || undefined,
      });
      const c = res.customer;
      setCreated((prev) => [
        ...prev,
        { id: c.id, name: c.name, phone: c.phone, place: c.place, produceDue: 0, collectedAmount: 0, collections: 0, crops: [], fertilizerCredit: 0, lastCollection: null },
      ]);
      setCustomerId(c.id);
      setAdding(false);
      setErrors((prev) => ({ ...prev, customerId: "" }));
      toast.success(`${party.name} added`);
      void mutateFarmers();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!effectiveItemId) errs.itemId = "Choose the crop.";
    if (!customerId) errs.customerId = "Choose the farmer.";
    if (!date) errs.date = "Choose a date.";
    if (!quantity) errs.quantity = "Enter the quantity.";
    else if (!Number.isFinite(qtyNum) || qtyNum <= 0) errs.quantity = "Quantity must be more than 0.";
    if (!shownRate) errs.rate = `Enter the rate per ${unit}.`;
    else if (!Number.isFinite(rateNum) || rateNum <= 0) errs.rate = "Rate must be more than 0.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: ProduceCollectionInput = { shopId, itemId: effectiveItemId, customerId, date, quantity: qtyNum, rate: rateNum, notes: notes.trim() || undefined };
    setSaving(true);
    try {
      await sendJson("/api/inventory/produce/collections", "POST", body);
      toast.success(`${formatQuantity(qtyNum, unit)} of ${item?.name ?? "produce"} recorded`, {
        description: `${formatINR(amount)} added to what you owe ${selected?.name ?? "the farmer"}.`,
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
      eyebrow="Produce collection"
      title="Collect produce from a farmer"
      subtitle="Weigh the crop and note today's rate. The amount is owed to the farmer until you pay them."
      footer={
        <>
          <div className="mr-auto flex flex-col justify-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">Amount owed</span>
            <span className="text-xl font-black text-slate-900 leading-tight">{formatINR(amount)}</span>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="collection-form" disabled={saving} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            Save collection
          </button>
        </>
      }
    >
      <form
        id="collection-form"
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
            <CropPicker shopId={shopId} items={items} value={effectiveItemId} onChange={changeItem} error={errors.itemId} onCreated={() => void mutateItems()} />
          </div>
          <div>
            <span className={labelClass}>Date <RequiredMark /></span>
            <DatePickerInput value={date} onChange={setDate} hasError={!!errors.date} disableFutureDates />
            <FieldError message={errors.date} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className={labelClass}>Farmer <RequiredMark /></span>
            {!adding && (
              <button type="button" onClick={() => setAdding(true)} className="mb-2 text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                <i className="ph-bold ph-user-plus" /> New farmer
              </button>
            )}
          </div>
          <CustomDropdown options={farmerOptions} value={customerId} onChange={onFarmer} error={!!errors.customerId} placeholder="Choose farmer" />
          <FieldError message={errors.customerId} />
        </div>

        {adding && <QuickAddParty title="New farmer" namePlaceholder="Farmer's name *" onCancel={() => setAdding(false)} onSave={addFarmer} />}

        {selected && selected.fertilizerCredit > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-xs sm:text-sm text-sky-800">
            <i className="ph-bold ph-info text-base mt-0.5" aria-hidden="true" />
            <span>
              {selected.name} owes <span className="font-extrabold">{formatINR(selected.fertilizerCredit)}</span> fertilizer credit. You can deduct it when you pay for the produce.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="collection-qty" className={labelClass}>Quantity <RequiredMark /></label>
            <div className="relative">
              <input
                id="collection-qty"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={quantity}
                onChange={(e) => setQuantity(sanitizeDecimal(e.target.value))}
                placeholder="0"
                aria-invalid={!!errors.quantity || undefined}
                className={cn(inputClass, "pr-16", errors.quantity && inputErrorClass)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{unit}</span>
            </div>
            <FieldError message={errors.quantity} />
          </div>
          <div>
            <label htmlFor="collection-rate" className={labelClass}>Rate per {unit} <RequiredMark /></label>
            <MoneyInput
              id="collection-rate"
              value={shownRate}
              onChange={(v) => {
                setRateTouched(true);
                setRate(sanitizeDecimal(v, 2));
              }}
              hasError={!!errors.rate}
              placeholder="0.00"
            />
            <FieldError message={errors.rate} />
            {lastToday && !rateTouched && <p className="mt-1 text-[11px] font-semibold text-slate-400">Today&apos;s rate from the last collection</p>}
          </div>
        </div>

        <div>
          <label htmlFor="collection-notes" className={labelClass}>Notes</label>
          <input id="collection-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="Optional, e.g. quality, moisture, vehicle" className={inputClass} />
        </div>
      </form>
    </InventoryDialog>
  );
}
