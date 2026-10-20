"use client";

import type { Shop } from "@/types/shops";
import ShopIcon from "@/components/shops/ShopIcon";
import { Tooltip } from "@/components/ui/Tooltip";
import { shopTypeOf } from "@/components/providers/ShopProvider";
import { SHOP_TYPE_LABELS } from "@/lib/shopModules";

interface ShopRowProps {
  shop: Shop;
  isBusy: boolean;
  /** The only active shop: archiving will be refused by the API. */
  isLastActive: boolean;
  onEdit: () => void;
  onSetDefault: () => void;
  /** Pick who can open the shop and with which role (every shop type). */
  onManageMembers: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

const actionClass =
  "h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function ShopRow({ shop, isBusy, isLastActive, onEdit, onSetDefault, onManageMembers, onToggleArchive, onDelete }: ShopRowProps) {
  const hasEntries = shop.transactionCount > 0;
  const type = shopTypeOf(shop);
  const isStudio = type === "STUDIO";
  const memberCount = shop.members?.length ?? 0;

  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm transition ${
        shop.isArchived ? "border-dashed border-slate-200 opacity-75" : "border-slate-100"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl text-white shadow-sm"
          style={{ backgroundColor: shop.color }}
        >
          <ShopIcon icon={shop.icon} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{shop.name}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                isStudio ? "bg-indigo-50 text-indigo-600" : "bg-lime-50 text-lime-700"
              }`}
            >
              <i aria-hidden="true" className={`ph-bold ${isStudio ? "ph-camera" : "ph-plant"}`} />
              {SHOP_TYPE_LABELS[type]}
            </span>
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
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-slate-400 [&>span]:whitespace-nowrap">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: shop.color }} />
              <span className="font-mono uppercase">{shop.color}</span>
            </span>
            <span>&middot;</span>
            <span>
              {shop.transactionCount.toLocaleString("en-IN")} {shop.transactionCount === 1 ? "entry" : "entries"}
            </span>
            <span>&middot;</span>
            <span>{memberCount === 0 ? "Owners only" : `${memberCount} ${memberCount === 1 ? "person" : "people"} + owners`}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 lg:border-0 lg:pt-0 lg:justify-end">
        {isBusy && <i className="ph ph-circle-notch animate-spin text-slate-400 mr-1" />}
        <button type="button" onClick={onEdit} disabled={isBusy} className={`${actionClass} text-slate-600 hover:bg-slate-100`}>
          <i className="ph-bold ph-pencil-simple" /> Edit
        </button>
        <button type="button" onClick={onManageMembers} disabled={isBusy} className={`${actionClass} text-slate-600 hover:bg-slate-100`}>
          <i aria-hidden="true" className="ph-bold ph-users-three" /> People
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold inline-flex items-center justify-center">
            {memberCount}
          </span>
        </button>
        {/* The default shop receives booking and gift payments, so it must be a studio shop. */}
        {isStudio && !shop.isDefault && !shop.isArchived && (
          <button type="button" onClick={onSetDefault} disabled={isBusy} className={`${actionClass} text-orange-600 hover:bg-orange-50`}>
            <i className="ph-bold ph-star" /> Set as default
          </button>
        )}
        <Tooltip content={isLastActive ? "You can't archive the last active shop" : undefined}>
          <button
            type="button"
            onClick={onToggleArchive}
            disabled={isBusy}
            className={`${actionClass} ${isLastActive ? "text-slate-300 hover:bg-slate-50" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <i className={`ph-bold ${shop.isArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}`} />
            {shop.isArchived ? "Unarchive" : "Archive"}
          </button>
        </Tooltip>
        <Tooltip content={hasEntries ? "Shops with ledger entries can't be deleted. Archive it instead." : undefined}>
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className={`${actionClass} ${hasEntries ? "text-slate-300 hover:bg-slate-50" : "text-rose-600 hover:bg-rose-50"}`}
          >
            <i className="ph-bold ph-trash" /> Delete
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
