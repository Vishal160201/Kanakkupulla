"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CreditCustomer, CreditCustomerInput } from "@/types/inventory";
import { FieldError, InventoryDialog, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { errorMessage, sendJson, useRevalidateInventory } from "../inventoryUtils";
import { cn } from "@/lib/utils";

const PHONE_RE = /^[0-9+\-\s]{6,20}$/;

export function validateCustomer(name: string, phone: string): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!name.trim()) errs.name = "Customer name is required.";
  else if (name.trim().length > 100) errs.name = "Name is too long.";
  if (phone.trim() && !PHONE_RE.test(phone.trim())) errs.phone = "Enter a valid phone number.";
  return errs;
}

/** Add / edit a credit customer (farmer). Mount only while open. */
export default function CustomerFormDialog({
  shopId,
  customer,
  onClose,
  onSaved,
}: {
  shopId: string;
  customer: CreditCustomer | null;
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
    const errs = validateCustomer(name, phone);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const body: CreditCustomerInput = { name: name.trim(), phone: phone.trim(), place: place.trim() };
    setSaving(true);
    try {
      const res = customer
        ? await sendJson<{ customer: CreditCustomer }>(`/api/inventory/customers/${encodeURIComponent(customer.id)}`, "PUT", body)
        : await sendJson<{ customer: CreditCustomer }>("/api/inventory/customers", "POST", { ...body, shopId });
      toast.success(customer ? "Customer updated" : "Customer added");
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
      eyebrow={customer ? "Edit customer" : "New customer"}
      title={customer ? `Edit ${customer.name}` : "Add a customer"}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="customer-form" disabled={saving} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            {customer ? "Save changes" : "Add customer"}
          </button>
        </>
      }
    >
      <form
        id="customer-form"
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="customer-name" className={labelClass}>Name <RequiredMark /></label>
          <input id="customer-name" autoFocus value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Farmer's name" className={cn(inputClass, errors.name && inputErrorClass)} />
          <FieldError message={errors.name} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="customer-phone" className={labelClass}>Phone</label>
            <input id="customer-phone" type="tel" inputMode="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className={cn(inputClass, errors.phone && inputErrorClass)} />
            <FieldError message={errors.phone} />
          </div>
          <div>
            <label htmlFor="customer-place" className={labelClass}>Village / place</label>
            <input id="customer-place" value={place} maxLength={100} onChange={(e) => setPlace(e.target.value)} placeholder="Village" className={inputClass} />
          </div>
        </div>
      </form>
    </InventoryDialog>
  );
}
