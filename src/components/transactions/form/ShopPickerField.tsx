"use client";

import { useShops } from "@/components/providers/ShopProvider";
import { ShopDot } from "@/components/shops/ShopBadge";
import type { Shop } from "@/types/shops";
import { FieldError } from "./FieldChrome";

interface ShopPickerFieldProps {
  value: string;
  onChange: (shopId: string) => void;
  error?: string;
  /** Shop the entry was saved in (edit mode); shown even when it has since been archived. */
  originalShopId?: string | null;
}

const labelClass = "block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase";

/**
 * Fixed (non-layout) "Shop" field of the transaction form. Only active shops can be
 * picked; an entry already in an archived shop keeps showing it until it is moved.
 */
export default function ShopPickerField({ value, onChange, error, originalShopId }: ShopPickerFieldProps) {
  const { shops, allShops } = useShops();
  if (shops.length === 0) return null;

  const archivedOriginal = originalShopId
    ? allShops.find((s) => s.id === originalShopId && s.isArchived) ?? null
    : null;
  const options: Shop[] = archivedOriginal ? [...shops, archivedOriginal] : shops;

  // One active shop and nothing to choose between: show it compactly.
  if (options.length === 1 && value === options[0].id) {
    const only = options[0];
    return (
      <div className="flex items-center gap-3 bg-white rounded-2xl px-4 sm:px-6 py-3 mb-4 sm:mb-6 shadow-sm border border-slate-100">
        <span className={labelClass}>Shop</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <ShopDot color={only.color} className="w-2.5 h-2.5" />
          {only.icon && <span className="leading-none">{only.icon}</span>}
          {only.name}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between gap-3 mb-3">
        <label id="tx-shop-label" className={labelClass}>
          Shop <span className="text-red-500">*</span>
        </label>
        {!value && <span className="text-[11px] font-semibold text-slate-400">Which shop is this entry for?</span>}
      </div>
      <div role="radiogroup" aria-labelledby="tx-shop-label" className="flex flex-wrap gap-2">
        {options.map((shop) => {
          const isSelected = value === shop.id;
          const isArchived = shop.isArchived;
          return (
            <button
              key={shop.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(shop.id)}
              title={isArchived ? "This shop is archived. Pick an active shop to move the entry." : shop.name}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
                isSelected
                  ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm ring-2 ring-orange-500/15"
                  : error
                    ? "border-red-300 bg-white text-slate-600 hover:bg-slate-50"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-slate-300"
              } ${isArchived ? "border-dashed opacity-60" : ""}`}
            >
              <ShopDot color={shop.color} className="w-2.5 h-2.5" />
              {shop.icon && <span className="leading-none">{shop.icon}</span>}
              <span className="max-w-[160px] truncate">{shop.name}</span>
              {isArchived && <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Archived</span>}
              {isSelected && !isArchived && <i className="ph-bold ph-check text-xs" />}
            </button>
          );
        })}
      </div>
      <FieldError message={error} />
    </div>
  );
}
