"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import type { InventoryProduct, InventoryProductInput } from "@/types/inventory";
import { PACK_UNITS, isPackType, isSizedPackType, validatePack, type PackType } from "@/lib/inventoryPacks";
import { FieldError, InventoryDialog, MoneyInput, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { PACK_TYPE_OPTIONS, errorDetails, errorMessage, packLabel, packUnitOptions, parseDecimal, quantityUnit, sanitizeDecimal, sendJson, useRevalidateInventory } from "../inventoryUtils";
import { cn } from "@/lib/utils";

interface ProductFormDialogProps {
  shopId: string;
  /** Product being edited, or null to add one. */
  product: InventoryProduct | null;
  onClose: () => void;
}

const SIZE_PLACEHOLDERS: Partial<Record<PackType, string>> = { Bottle: "e.g. 1", Packet: "e.g. 250", Bag: "e.g. 50" };

/** Add / edit a product (name, pack type and size, price). Mount only while open. */
export default function ProductFormDialog({ shopId, product, onClose }: ProductFormDialogProps) {
  const revalidate = useRevalidateInventory();
  const [name, setName] = useState(product?.name ?? "");
  // Old rows may hold a unit that is no longer a pack type; it has to be changed on save.
  const [unit, setUnit] = useState<string>(product && isPackType(product.unit) ? product.unit : "Bag");
  const [packSize, setPackSize] = useState(product?.packSize ? String(product.packSize) : "");
  const [packUnit, setPackUnit] = useState<string>(product?.packUnit ?? PACK_UNITS.Bag[0]);
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const sized = isSizedPackType(unit);
  const unitChoices = packUnitOptions(unit);
  const sizeNum = parseDecimal(packSize);
  const preview = { unit, packSize: Number.isFinite(sizeNum) && sizeNum > 0 ? sizeNum : null, packUnit: unit === "Piece" ? null : packUnit };

  const changeType = (next: string) => {
    setUnit(next);
    const allowed = PACK_UNITS[next as PackType] ?? [];
    // Keep the chosen measure when the new type allows it (e.g. kg for Packet → Bag)
    if (!allowed.includes(packUnit)) setPackUnit(allowed[next === "Bottle" ? 1 : 0] ?? "");
    setErrors((prev) => ({ ...prev, unit: "", packSize: "", packUnit: "" }));
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    const priceNum = parseDecimal(price);
    if (!name.trim()) errs.name = "Product name is required.";
    else if (name.trim().length > 100) errs.name = "Product name is too long.";
    const pack = validatePack({ unit, packSize: sized ? (Number.isFinite(sizeNum) ? sizeNum : null) : null, packUnit: unit === "Piece" ? null : packUnit });
    if (!pack.ok) Object.assign(errs, pack.errors);
    if (!price.trim()) errs.price = "Price is required.";
    else if (!Number.isFinite(priceNum) || priceNum < 0) errs.price = "Enter a valid price.";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || !pack.ok) return;

    const body: InventoryProductInput = { name: name.trim(), ...pack.value, price: priceNum };
    setSaving(true);
    try {
      if (product) {
        await sendJson(`/api/inventory/products/${encodeURIComponent(product.id)}`, "PUT", body);
        toast.success("Product updated");
      } else {
        await sendJson("/api/inventory/products", "POST", { ...body, shopId });
        toast.success("Product added");
      }
      revalidate();
      onClose();
    } catch (err) {
      const message = errorMessage(err);
      const details = errorDetails(err);
      if (details && typeof details === "object") setErrors(details as Record<string, string>);
      else if (/name/i.test(message) && /exist|duplicate|already/i.test(message)) setErrors({ name: message });
      toast.error(message);
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
      eyebrow={product ? "Edit product" : "New product"}
      title={product ? `Edit ${product.name}` : "Add a product"}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="product-form" disabled={saving} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            {product ? "Save changes" : "Add product"}
          </button>
        </>
      }
    >
      <form
        id="product-form"
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="product-name" className={labelClass}>Name <RequiredMark /></label>
          <input
            id="product-name"
            autoFocus
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Urea"
            className={cn(inputClass, errors.name && inputErrorClass)}
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <span className={labelClass}>Sold as <RequiredMark /></span>
          <CustomDropdown options={PACK_TYPE_OPTIONS} value={unit} onChange={changeType} error={!!errors.unit} placeholder="Pack type" />
          <FieldError message={errors.unit} />
          {product && !isPackType(product.unit) && (
            <p className="mt-1 text-xs font-medium text-amber-700">Was &quot;{product.unit}&quot;. Pick how it&apos;s packed now.</p>
          )}
        </div>

        {sized && (
          <div className="grid grid-cols-[1fr_110px] gap-3 animate-slide-down">
            <div>
              <label htmlFor="product-size" className={labelClass}>{unit} size <RequiredMark /></label>
              <input
                id="product-size"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={packSize}
                onChange={(e) => setPackSize(sanitizeDecimal(e.target.value))}
                placeholder={SIZE_PLACEHOLDERS[unit as PackType]}
                aria-invalid={!!errors.packSize || undefined}
                className={cn(inputClass, errors.packSize && inputErrorClass)}
              />
              <FieldError message={errors.packSize} />
            </div>
            <div>
              <span className={labelClass}>In <RequiredMark /></span>
              {unitChoices.length > 1 ? (
                <CustomDropdown options={unitChoices} value={packUnit} onChange={setPackUnit} error={!!errors.packUnit} placeholder="Unit" />
              ) : (
                <div className={cn(inputClass, "flex items-center bg-slate-50 text-slate-500")}>{PACK_UNITS[unit as PackType]?.[0]}</div>
              )}
              <FieldError message={errors.packUnit} />
            </div>
          </div>
        )}

        {unit === "Loose" && (
          <div className="animate-slide-down">
            <span className={labelClass}>Sold by <RequiredMark /></span>
            <CustomDropdown options={unitChoices} value={packUnit} onChange={setPackUnit} error={!!errors.packUnit} placeholder="kg / litre / tonne" />
            <FieldError message={errors.packUnit} />
          </div>
        )}

        <div>
          <label htmlFor="product-price" className={labelClass}>Price per {quantityUnit(preview)} <RequiredMark /></label>
          <MoneyInput id="product-price" value={price} onChange={(v) => setPrice(sanitizeDecimal(v, 2))} hasError={!!errors.price} placeholder="0.00" />
          <FieldError message={errors.price} />
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
          <i className="ph-bold ph-tag text-slate-400" aria-hidden="true" />
          <span className="min-w-0 truncate">
            Shows as <span className="font-extrabold text-slate-800">{name.trim() || "Product"} · {packLabel(preview)}</span>
          </span>
        </div>

        {!product && (
          <p className="text-xs font-medium text-slate-400">
            New products start with zero stock. Record a purchase or adjust stock to add quantity.
          </p>
        )}
      </form>
    </InventoryDialog>
  );
}
