"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isStudioShop, shopTypeOf, useShops } from "@/components/providers/ShopProvider";
import ShopIcon from "@/components/shops/ShopIcon";
import { SHOP_TYPE_GROUPS, landingPathForShopType } from "@/lib/shopModules";
import type { ActiveShopId, ShopType } from "@/types/shops";
import { useDismiss } from "./useDismiss";
import { useAccess } from "@/hooks/useAccess";

const ALL_COLOR = "#64748b";
const HEADING_CLASS = "px-2 pt-1 pb-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-slate-400";

/** Icon tile tinted with the shop colour. */
function IconTile({ color, size = "w-7 h-7 rounded-lg text-[0.85rem]", children }: { color: string; size?: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center shrink-0 ${size}`}
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {children}
    </span>
  );
}

const GROUP_LABELS = { STUDIO: "Studio", OTHERS: "Others" } as const;

/** Small tag with the member's role in a shop ("Admin", "Staff"). */
function RoleTag({ name, active }: { name: string; active?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${
        active ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {name}
    </span>
  );
}

/**
 * Header chip showing the selected shop, with its own dropdown to switch shops.
 * Shops are grouped as STUDIO (All Shops for admins + studio shops) and OTHERS
 * (fertilizer shops). Members see their role in each shop as a small tag. Switching to a shop of another type lands on that type's
 * home page; same-type switches keep the current page. Hidden when there is
 * nothing to switch between.
 */
export default function StudioShopPicker() {
  const { shops, activeShop, activeShopId, activeShopType, canViewAllShops, setActiveShopId, isReady } = useShops();
  const { shopAccess } = useAccess();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setIsOpen(false));

  const optionCount = shops.length + (canViewAllShops ? 1 : 0);
  if (!isReady || optionCount <= 1) return null;

  const studioShops = shops.filter(isStudioShop);
  const otherShops = shops.filter((s) => !isStudioShop(s));

  const isAll = activeShopId === "all" || !activeShop;
  const label = isAll ? "All Shops" : activeShop.name;
  const color = isAll ? ALL_COLOR : activeShop.color;
  const groupLabel = GROUP_LABELS[SHOP_TYPE_GROUPS[activeShopType]];
  const activeRole = isAll ? undefined : shopAccess(activeShop.id)?.roleName;

  const select = (id: ActiveShopId, type: ShopType) => {
    setIsOpen(false);
    if (id === activeShopId) return;
    setActiveShopId(id);
    if (type !== activeShopType) router.push(landingPathForShopType(type));
  };

  const option = (id: string, type: ShopType, optionLabel: string, optionColor: string, icon: React.ReactNode) => {
    const isActive = activeShopId === id;
    const roleName = id === "all" ? undefined : shopAccess(id)?.roleName;
    return (
      <button
        key={id}
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={() => select(id, type)}
        className={`w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[0.85rem] font-semibold transition-colors ${
          isActive ? "bg-orange-50 text-orange-700" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <IconTile color={optionColor}>{icon}</IconTile>
        <span className="flex-1 truncate">{optionLabel}</span>
        {roleName && <RoleTag name={roleName} active={isActive} />}
        {isActive && <i aria-hidden="true" className="ph-bold ph-check text-orange-500 text-sm" />}
      </button>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="studio-shop-list"
        aria-label={`${groupLabel}: ${label}${activeRole ? ` (${activeRole})` : ""}. Change shop`}
        className={`h-[45px] inline-flex items-center gap-2 rounded-full border bg-white pl-1.5 pr-1.5 sm:pr-3.5 shadow-sm transition-colors max-w-[220px] ${
          isOpen ? "border-orange-300 ring-2 ring-orange-500/15" : "border-gray-200 hover:bg-slate-50 hover:border-slate-300"
        }`}
      >
        <IconTile color={color} size="w-[33px] h-[33px] rounded-full text-base">
          {isAll ? <i className="ph-bold ph-squares-four" /> : <ShopIcon icon={activeShop.icon} />}
        </IconTile>
        <span className="hidden sm:flex flex-col items-start leading-tight min-w-0">
          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">
            {groupLabel}
            {activeRole && <span className="text-orange-500"> · {activeRole}</span>}
          </span>
          <span className="text-[0.8rem] font-bold text-slate-800 truncate max-w-[150px]">{label}</span>
        </span>
        <i
          aria-hidden="true"
          className={`ph-bold ph-caret-down text-[0.65rem] text-slate-400 hidden sm:block transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[240px] max-h-[min(70vh,480px)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-top-1">
          <div id="studio-shop-list" role="listbox" aria-label="Select shop" className="flex flex-col gap-0.5">
            {(canViewAllShops || studioShops.length > 0) && (
              <div role="group" aria-labelledby="shop-group-studio" className="flex flex-col gap-0.5">
                <div id="shop-group-studio" className={HEADING_CLASS}>{GROUP_LABELS.STUDIO}</div>
                {canViewAllShops && option("all", "STUDIO", "All Shops", ALL_COLOR, <i className="ph-bold ph-squares-four" />)}
                {studioShops.map((shop) => option(shop.id, "STUDIO", shop.name, shop.color, <ShopIcon icon={shop.icon} />))}
              </div>
            )}
            {otherShops.length > 0 && (
              <div
                role="group"
                aria-labelledby="shop-group-others"
                className={`flex flex-col gap-0.5 ${canViewAllShops || studioShops.length > 0 ? "mt-1 pt-1 border-t border-slate-100" : ""}`}
              >
                <div id="shop-group-others" className={HEADING_CLASS}>{GROUP_LABELS.OTHERS}</div>
                {otherShops.map((shop) => option(shop.id, shopTypeOf(shop), shop.name, shop.color, <ShopIcon icon={shop.icon} />))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
