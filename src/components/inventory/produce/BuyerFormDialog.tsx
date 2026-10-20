"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ProduceBuyer, ProduceBuyerInput } from "@/types/inventory";
import { FieldError, InventoryDialog, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { errorMessage, sendJson, useRevalidateInventory } from "../inventoryUtils";
import { validateCustomer } from "../credit/CustomerFormDialog";
import { cn } from "@/lib/utils";

/** Add / edit a produce buyer (marketer / trader). Mount only while open. */
export default function BuyerFormDialog({
  shopId,
  buyer,
  onClose,
  onSaved,
}: {
  shopId: string;
  buyer: Pick<ProduceBuyer, "id" | "name" | "phone" | "place"> | null;
  onClose: () => void;
  onSaved?: (buyer: ProduceBuyer) => void;
}) {
  const revalidate = useRevalidateInventory();
  const [name, setName] = useState(buyer?.name ?? "");
  const [phone, setPhone] = useState(buyer?.phone ?? "");
  const [place, setPlace] = useState(buyer?.place ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const errs = validateCustomer(name, phone);
    if (errs.name) errs.name = "Buyer name is required.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const body: ProduceBuyerInput = { name: name.trim(), phone: phone.trim(), place: place.trim() };
    setSaving(true);
    try {
      const res = buyer
        ? await sendJson<{ buyer: ProduceBuyer }>(`/api/inventory/produce/buyers/${encodeURIComponent(buyer.id)}`, "PUT", body)
        : await sendJson<{ buyer: ProduceBuyer }>("/api/inventory/produce/buyers", "POST", { ...body, shopId });
      toast.success(buyer ? "Buyer updated" : "Buyer added");
      revalidate();
      if (res?.buyer) onSaved?.(res.buyer);
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
      eyebrow={buyer ? "Edit buyer" : "New buyer"}
      title={buyer ? `Edit ${buyer.name}` : "Add a produce buyer"}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="buyer-form" disabled={saving} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            {buyer ? "Save changes" : "Add buyer"}
          </button>
        </>
      }
    >
      <form
        id="buyer-form"
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="buyer-name" className={labelClass}>Name <RequiredMark /></label>
          <input id="buyer-name" autoFocus value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Marketer / trader name" className={cn(inputClass, errors.name && inputErrorClass)} />
          <FieldError message={errors.name} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="buyer-phone" className={labelClass}>Phone</label>
            <input id="buyer-phone" type="tel" inputMode="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className={cn(inputClass, errors.phone && inputErrorClass)} />
            <FieldError message={errors.phone} />
          </div>
          <div>
            <label htmlFor="buyer-place" className={labelClass}>Place</label>
            <input id="buyer-place" value={place} maxLength={100} onChange={(e) => setPlace(e.target.value)} placeholder="Town / market" className={inputClass} />
          </div>
        </div>
      </form>
    </InventoryDialog>
  );
}
