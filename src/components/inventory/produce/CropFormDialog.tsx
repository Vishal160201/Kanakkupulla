"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import type { ProduceItem, ProduceItemInput } from "@/types/inventory";
import { FieldError, InventoryDialog, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { errorDetails, errorMessage, sendJson, useRevalidateInventory } from "../inventoryUtils";
import { PRODUCE_UNIT_OPTIONS } from "./produceShared";
import { cn } from "@/lib/utils";

/** Add / rename a crop in the shop's produce list. Mount only while open. */
export default function CropFormDialog({ shopId, item, onClose }: { shopId: string; item: ProduceItem | null; onClose: () => void }) {
  const revalidate = useRevalidateInventory();
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "kg");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Crop name is required.";
    else if (name.trim().length > 60) errs.name = "Crop name is too long.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const body: ProduceItemInput = { name: name.trim(), unit };
    setSaving(true);
    try {
      if (item) {
        await sendJson(`/api/inventory/produce/items/${encodeURIComponent(item.id)}`, "PUT", body);
        toast.success("Crop updated");
      } else {
        await sendJson("/api/inventory/produce/items", "POST", { ...body, shopId });
        toast.success(`${body.name} added to your crops`);
      }
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
      size="sm"
      eyebrow={item ? "Edit crop" : "New crop"}
      title={item ? `Edit ${item.name}` : "Add a crop"}
      subtitle="Quantities and rates for this crop are in its unit."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="crop-form" disabled={saving} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            {item ? "Save changes" : "Add crop"}
          </button>
        </>
      }
    >
      <form
        id="crop-form"
        noValidate
        className="grid grid-cols-[1fr_130px] gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="crop-name" className={labelClass}>Name <RequiredMark /></label>
          <input id="crop-name" autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maize, Paddy" className={cn(inputClass, errors.name && inputErrorClass)} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <span className={labelClass}>Unit <RequiredMark /></span>
          <CustomDropdown options={PRODUCE_UNIT_OPTIONS} value={unit} onChange={setUnit} error={!!errors.unit} />
          <FieldError message={errors.unit} />
        </div>
      </form>
    </InventoryDialog>
  );
}
