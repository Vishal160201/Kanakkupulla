"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FieldError, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, sendJson } from "@/components/inventory/inventoryUtils";
import type { CableSubscriberDetail } from "@/types/cable";
import { cn } from "@/lib/utils";
import Autocomplete from "@/components/ui/Autocomplete";
import { useRevalidateCable, useSubscribers } from "./useCableData";

type Errors = Partial<Record<"name" | "tamilName" | "phone" | "oldVcNumber" | "groupName", string>>;

/** The shop's corrections to a subscriber. Name and phone stay as typed here even when the portal shows others. */
export default function EditSubscriberForm({ s, onDone }: { s: CableSubscriberDetail; onDone: () => void }) {
  const revalidate = useRevalidateCable();
  const isCable = s.provider === "TCCL";
  const [form, setForm] = useState({ name: s.name, tamilName: s.tamilName ?? "", phone: s.phone ?? "", oldVcNumber: s.oldVcNumber ?? "", groupName: s.groupName ?? "" });
  // The shop's groups so far (the list is already loaded behind this dialog)
  const groups = [...new Set((useSubscribers(s.shopId).data?.subscribers ?? []).map((x) => x.groupName).filter((g): g is string => !!g))].sort();
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const errs: Errors = {};
    if (!form.name.trim()) errs.name = "Enter the name.";
    const phone = form.phone.replace(/[\s-]/g, "");
    if (phone && !/^\+?\d{10,13}$/.test(phone)) errs.phone = "Enter a 10-digit mobile number.";
    const vc = form.oldVcNumber.replace(/\s/g, "");
    if (vc && !/^\d{6,20}$/.test(vc)) errs.oldVcNumber = "A VC number is digits only.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await sendJson(`/api/cable/subscribers/${encodeURIComponent(s.id)}`, "PATCH", { name: form.name, tamilName: form.tamilName, phone, oldVcNumber: vc, groupName: form.groupName.trim() });
      toast.success("Subscriber updated");
      revalidate();
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, required = false) => (
    <div>
      <label htmlFor={`sub-edit-${k}`} className={labelClass}>
        {label} {required && <RequiredMark />}
      </label>
      <input id={`sub-edit-${k}`} value={form[k]} onChange={set(k)} className={cn(inputClass, errors[k] && inputErrorClass)} aria-invalid={!!errors[k]} {...props} />
      <FieldError message={errors[k]} />
    </div>
  );

  return (
    <form
      noValidate
      className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 space-y-3 animate-slide-down"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
        <i className="ph-bold ph-pencil-simple text-orange-600" aria-hidden="true" /> Edit subscriber
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("name", "Name (English)", { maxLength: 100 }, true)}
        {field("tamilName", "Name (Tamil)", { maxLength: 100, lang: "ta" })}
        {field("phone", "Mobile", { inputMode: "tel", maxLength: 16, placeholder: `Blank = ${isCable ? "TCCL" : "portal"}'s number` })}
        {isCable && field("oldVcNumber", "Old VC (customer's box)", { inputMode: "numeric", maxLength: 20, placeholder: "When a replacement box is given" })}
        <div>
          <span className={labelClass}>Group (area / line)</span>
          <Autocomplete suggestions={groups} value={form.groupName} onChange={(v) => setForm((f) => ({ ...f, groupName: v.slice(0, 60) }))} placeholder="e.g. Sheet A, North street" />
        </div>
      </div>
      <p className="text-[11px] font-semibold text-slate-400">The name and mobile you save here stay, even when {isCable ? "TCCL" : "the portal"} shows different ones.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} disabled={saving} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
        <button type="submit" disabled={saving} className={cn(primaryButtonClass, "h-10")}>
          {saving ? <i className="ph ph-circle-notch animate-spin" aria-hidden="true" /> : <i className="ph-bold ph-check" aria-hidden="true" />}
          Save
        </button>
      </div>
    </form>
  );
}
