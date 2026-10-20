"use client";

import type { Shop } from "@/types/shops";

interface ShopRowProps {
  shop: Shop;
  isBusy: boolean;
  /** The only active shop: archiving will be refused by the API. */
  isLastActive: boolean;
  onEdit: () => void;
  onSetDefault: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

const actionClass =
  "h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function ShopRow({ shop, isBusy, isLastActive, onEdit, onSetDefault, onToggleArchive, onDelete }: ShopRowProps) {
  const hasEntries = shop.transactionCount > 0;

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm transition ${
        shop.isArchived ? "border-dashed border-slate-200 opacity-75" : "border-slate-100"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl text-white shadow-sm"
          style={{ backgroundColor: shop.color }}
        >
          {shop.icon || <i className="ph-bold ph-storefront" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{shop.name}</span>
            {shop.isDefault && (
              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-600">
                Default
              </span>
            )}
            {shop.isArchived && (
              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-500">
                Archived
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: shop.color }} />
              <span className="font-mono uppercase">{shop.color}</span>
            </span>
            <span>&middot;</span>
            <span>
              {shop.transactionCount.toLocaleString("en-IN")} {shop.transactionCount === 1 ? "entry" : "entries"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        {isBusy && <i className="ph ph-circle-notch animate-spin text-slate-400 mr-1" />}
        <button type="button" onClick={onEdit} disabled={isBusy} className={`${actionClass} text-slate-600 hover:bg-slate-100`}>
          <i className="ph-bold ph-pencil-simple" /> Edit
        </button>
        {!shop.isDefault && !shop.isArchived && (
          <button type="button" onClick={onSetDefault} disabled={isBusy} className={`${actionClass} text-orange-600 hover:bg-orange-50`}>
            <i className="ph-bold ph-star" /> Set as default
          </button>
        )}
        <button
          type="button"
          onClick={onToggleArchive}
          disabled={isBusy}
          title={isLastActive ? "You can't archive the last active shop" : undefined}
          className={`${actionClass} ${isLastActive ? "text-slate-300 hover:bg-slate-50" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <i className={`ph-bold ${shop.isArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}`} />
          {shop.isArchived ? "Unarchive" : "Archive"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isBusy}
          title={hasEntries ? "Shops with ledger entries can't be deleted. Archive it instead." : undefined}
          className={`${actionClass} ${hasEntries ? "text-slate-300 hover:bg-slate-50" : "text-rose-600 hover:bg-rose-50"}`}
        >
          <i className="ph-bold ph-trash" /> Delete
        </button>
      </div>
    </div>
  );
}
