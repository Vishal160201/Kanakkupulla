"use client";

import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import type { CreditCustomer } from "@/types/inventory";
import { FieldError, inputClass, inputErrorClass, primaryButtonClass } from "../InventoryUI";
import { errorMessage, sendJson } from "../inventoryUtils";
import { validateParty } from "../farmers/FarmerFormDialog";
import { cn } from "@/lib/utils";

interface NewFarmerInlineProps {
  shopId: string;
  onCreated: (customer: CreditCustomer) => void;
  onCancel: () => void;
}

/** Inline "Add new farmer" mini-form inside the sale bill. */
export default function NewFarmerInline({ shopId, onCreated, onCancel }: NewFarmerInlineProps) {
  const [form, setForm] = useState({ name: "", phone: "", place: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const errs = validateParty(form.name, form.phone);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const res = await sendJson<{ customer: CreditCustomer }>("/api/inventory/customers", "POST", {
        shopId,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        place: form.place.trim() || undefined,
      });
      toast.success(`${form.name.trim()} added`);
      if (res?.customer) onCreated({ ...res.customer, balance: res.customer.balance ?? 0 });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    }
  };

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 space-y-3 animate-slide-down">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <i className="ph-bold ph-user-plus text-orange-500" /> New farmer
        </span>
        <button type="button" aria-label="Cancel new farmer" onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-700">
          <i className="ph-bold ph-x text-xs" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <input
            aria-label="Farmer name"
            autoFocus
            value={form.name}
            maxLength={100}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            onKeyDown={saveOnEnter}
            placeholder="Name *"
            className={cn(inputClass, errors.name && inputErrorClass)}
          />
          <FieldError message={errors.name} />
        </div>
        <div>
          <input
            aria-label="Farmer phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            maxLength={20}
            onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
            onKeyDown={saveOnEnter}
            placeholder="Phone"
            className={cn(inputClass, errors.phone && inputErrorClass)}
          />
          <FieldError message={errors.phone} />
        </div>
        <input
          aria-label="Farmer village or place"
          value={form.place}
          maxLength={100}
          onChange={(e) => setForm((c) => ({ ...c, place: e.target.value }))}
          onKeyDown={saveOnEnter}
          placeholder="Village / place"
          className={inputClass}
        />
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => void save()} disabled={saving} className={cn(primaryButtonClass, "h-10")}>
          {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
          Add customer
        </button>
      </div>
    </div>
  );
}
