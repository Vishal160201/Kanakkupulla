"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CreditCustomer, CreditCustomerInput } from "@/types/inventory";
import { FieldError, InventoryDialog, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { errorMessage, sendJson, useRevalidateInventory } from "../inventoryUtils";
import { cn } from "@/lib/utils";

const PHONE_RE = /^[0-9+\-\s]{6,20}$/;

/** Name + phone checks for farmers and buyers; `noun` names the party in the message. */
export function validateParty(name: string, phone: string, noun = "Farmer"): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!name.trim()) errs.name = `${noun} name is required.`;
  else if (name.trim().length > 100) errs.name = "Name is too long.";
  if (phone.trim() && !PHONE_RE.test(phone.trim())) errs.phone = "Enter a valid phone number.";
  return errs;
}

/** Add / edit a farmer (who buys fertilizer and sells produce). Mount only while open. */
export default function FarmerFormDialog({
  shopId,
  customer,
  onClose,
  onSaved,
}: {
  shopId: string;
  customer: Pick<CreditCustomer, "id" | "name" | "phone" | "place"> | null;
  onClose: () => void;
  onSaved?: (customer: CreditCustomer) => void;
}) {
  const revalidate = useRevalidateInventory();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [place, setPlace] = useState(customer?.place ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const errs = validateParty(name, phone);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const body: CreditCustomerInput = { name: name.trim(), phone: phone.trim(), place: place.trim() };
    setSaving(true);
    try {
      const res = customer
        ? await sendJson<{ customer: CreditCustomer }>(`/api/inventory/customers/${encodeURIComponent(customer.id)}`, "PUT", body)
        : await sendJson<{ customer: CreditCustomer }>("/api/inventory/customers", "POST", { ...body, shopId });
      toast.success(customer ? "Farmer updated" : "Farmer added");
      revalidate();
      if (res?.customer) onSaved?.(res.customer);
      onClose();
    } catch (err) {
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
      size="sm"
      eyebrow={customer ? "Edit farmer" : "New farmer"}
      title={customer ? `Edit ${customer.name}` : "Add a farmer"}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="farmer-form" disabled={saving} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            {customer ? "Save changes" : "Add farmer"}
          </button>
        </>
      }
    >
      <form
        id="farmer-form"
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="farmer-name" className={labelClass}>Name <RequiredMark /></label>
          <input id="farmer-name" autoFocus value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Farmer's name" className={cn(inputClass, errors.name && inputErrorClass)} />
          <FieldError message={errors.name} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="farmer-phone" className={labelClass}>Phone</label>
            <input id="farmer-phone" type="tel" inputMode="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className={cn(inputClass, errors.phone && inputErrorClass)} />
            <FieldError message={errors.phone} />
          </div>
          <div>
            <label htmlFor="farmer-place" className={labelClass}>Village / place</label>
            <input id="farmer-place" value={place} maxLength={100} onChange={(e) => setPlace(e.target.value)} placeholder="Village" className={inputClass} />
          </div>
        </div>
      </form>
    </InventoryDialog>
  );
}
