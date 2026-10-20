"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { InventoryProduct, StockAdjustmentInput } from "@/types/inventory";
import { FieldError, InventoryDialog, RequiredMark, SegmentToggle, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { errorMessage, formatQty, parseDecimal, quantityUnit, sanitizeDecimal, sendJson, useRevalidateInventory } from "../inventoryUtils";
import { cn } from "@/lib/utils";

interface AdjustStockDialogProps {
  shopId: string;
  product: InventoryProduct;
  onClose: () => void;
}

/** Manual stock correction (damage, count difference, opening stock...). Mount only while open. */
export default function AdjustStockDialog({ shopId, product, onClose }: AdjustStockDialogProps) {
  const revalidate = useRevalidateInventory();
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const qty = parseDecimal(quantity);
  const validQty = Number.isFinite(qty) && qty > 0;
  const after = validQty ? product.stock + (direction === "add" ? qty : -qty) : product.stock;

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!quantity.trim()) errs.quantity = "Enter a quantity.";
    else if (!validQty) errs.quantity = "Quantity must be more than zero.";
    else if (direction === "remove" && qty > product.stock) errs.quantity = `Only ${formatQty(product.stock)} ${quantityUnit(product, product.stock)} in stock.`;
    if (!notes.trim()) errs.notes = "Add a reason for the adjustment.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: StockAdjustmentInput = {
      shopId,
      productId: product.id,
      quantity: direction === "add" ? qty : -qty,
      notes: notes.trim(),
    };
    setSaving(true);
    try {
      await sendJson("/api/inventory/adjustments", "POST", body);
      toast.success(`Stock ${direction === "add" ? "added" : "removed"} for ${product.name}`);
      revalidate();
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
      eyebrow="Adjust stock"
      title={product.name}
      subtitle={<>Current stock: <span className="font-bold text-slate-700">{formatQty(product.stock)} {quantityUnit(product, product.stock)}</span></>}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="adjust-form" disabled={saving} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            Save adjustment
          </button>
        </>
      }
    >
      <form
        id="adjust-form"
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <SegmentToggle
          ariaLabel="Adjustment direction"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "add", label: "Add stock", icon: "plus", activeClass: "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" },
            { value: "remove", label: "Remove stock", icon: "minus", activeClass: "bg-rose-500 text-white shadow-md shadow-rose-500/30" },
          ]}
        />
        <div>
          <label htmlFor="adjust-qty" className={labelClass}>Quantity ({quantityUnit(product, 2)}) <RequiredMark /></label>
          <input
            id="adjust-qty"
            autoFocus
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={quantity}
            onChange={(e) => setQuantity(sanitizeDecimal(e.target.value))}
            placeholder="0"
            className={cn(inputClass, errors.quantity && inputErrorClass)}
          />
          <FieldError message={errors.quantity} />
          {validQty && (
            <p className={cn("mt-1.5 text-xs font-bold", after < 0 ? "text-rose-600" : "text-slate-500")}>
              Stock after: {formatQty(after)} {quantityUnit(product, after)}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="adjust-notes" className={labelClass}>Reason <RequiredMark /></label>
          <textarea
            id="adjust-notes"
            value={notes}
            maxLength={300}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Opening stock, damaged bags, stock count correction"
            className={cn(inputClass, "h-20 py-2.5 resize-none", errors.notes && inputErrorClass)}
          />
          <FieldError message={errors.notes} />
        </div>
      </form>
    </InventoryDialog>
  );
}
