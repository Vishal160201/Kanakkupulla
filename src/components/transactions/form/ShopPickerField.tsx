"use client";

import { useShops } from "@/components/providers/ShopProvider";
import ShopIcon from "@/components/shops/ShopIcon";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { DEFAULT_SHOP_ICON } from "@/lib/shopIcons";
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
          <span style={{ color: only.color }} className="inline-flex">
            <ShopIcon icon={only.icon} />
          </span>
          {only.name}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span id="tx-shop-label" className={labelClass}>
          Shop <span className="text-red-500">*</span>
        </span>
        {!value && <span className="text-[11px] font-semibold text-slate-400">Which shop is this entry for?</span>}
      </div>
      <div aria-labelledby="tx-shop-label">
        <CustomDropdown
          value={value}
          onChange={onChange}
          placeholder="Select a shop"
          error={!!error}
          options={options.map((shop) => ({
            value: shop.id,
            label: shop.name,
            color: shop.color,
            icon: shop.icon || DEFAULT_SHOP_ICON,
            hint: shop.isArchived ? "Archived" : undefined,
          }))}
        />
      </div>
      {archivedOriginal && value === archivedOriginal.id && (
        <p className="mt-2 text-[11px] font-semibold text-slate-400">
          This entry is in an archived shop. Pick an active shop to move it.
        </p>
      )}
      <FieldError message={error} />
    </div>
  );
}
