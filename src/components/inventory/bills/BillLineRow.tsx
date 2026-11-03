"use client";

import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import type { InventoryProduct } from "@/types/inventory";
import { FieldError, MoneyInput, inputClass, inputErrorClass } from "../InventoryUI";
import { formatINR, quantityUnit, sanitizeDecimal } from "../inventoryUtils";
import { cn } from "@/lib/utils";

export interface LineDraft {
  key: number;
  productId: string;
  quantity: string;
  unitPrice: string;
}

export interface LineErrors {
  product?: string;
  quantity?: string;
  unitPrice?: string;
}

interface BillLineRowProps {
  line: LineDraft;
  index: number;
  product: InventoryProduct | undefined;
  amount: number;
  errors: LineErrors;
  productOptions: DropdownOption[];
  productsLoading: boolean;
  onSelectProduct: (productId: string) => void;
  onChange: (patch: Partial<LineDraft>) => void;
  onRemove: () => void;
}

/** One product line of a bill: product, quantity, rate and amount. */
export default function BillLineRow({ line, index, product, amount, errors, productOptions, productsLoading, onSelectProduct, onChange, onRemove }: BillLineRowProps) {
  const n = index + 1;
  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5 md:p-1.5 md:bg-transparent md:border-0">
      <div className="grid grid-cols-[1fr_36px] md:grid-cols-[1fr_120px_130px_120px_36px] gap-2 items-start">
        <div className="min-w-0">
          <CustomDropdown
            options={productOptions}
            value={line.productId}
            onChange={onSelectProduct}
            error={!!errors.product}
            placeholder={productsLoading ? "Loading products…" : `Item ${n}: choose product`}
          />
          <FieldError message={errors.product} />
        </div>
        <div className="md:order-last pt-1.5 md:pt-0">
          <Tooltip content="Remove item">
            <button
              type="button"
              aria-label={`Remove item ${n}`}
              onClick={onRemove}
              className="h-9 w-9 md:h-[45px] flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <i className="ph-bold ph-trash" />
            </button>
          </Tooltip>
        </div>
        <div className="col-span-2 md:col-span-3 grid grid-cols-3 md:grid-cols-[120px_130px_120px] gap-2 md:contents">
          <div className="min-w-0">
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label={`Quantity for item ${n}`}
                aria-invalid={!!errors.quantity || undefined}
                value={line.quantity}
                onChange={(e) => onChange({ quantity: sanitizeDecimal(e.target.value) })}
                placeholder="Qty"
                className={cn(inputClass, "h-[45px] pr-11", errors.quantity && inputErrorClass)}
              />
              {product && (
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 max-w-[40px] truncate">{quantityUnit(product, 2)}</span>
              )}
            </div>
            <FieldError message={errors.quantity} />
          </div>
          <div className="min-w-0">
            <MoneyInput
              ariaLabel={`Rate for item ${n}`}
              value={line.unitPrice}
              onChange={(v) => onChange({ unitPrice: sanitizeDecimal(v, 2) })}
              hasError={!!errors.unitPrice}
              placeholder="Rate"
              className="[&_input]:h-[45px]"
            />
            <FieldError message={errors.unitPrice} />
          </div>
          <div className="h-[45px] flex items-center justify-end px-1 text-sm font-extrabold text-slate-900 truncate">
            {formatINR(amount)}
          </div>
        </div>
      </div>
    </li>
  );
}
