"use client";

import { useRef, useState } from "react";
import { useShops } from "@/components/providers/ShopProvider";
import ShopIcon from "@/components/shops/ShopIcon";
import { useDismiss } from "./useDismiss";

const ALL_COLOR = "#64748b";

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

/**
 * Header chip showing the selected shop, with its own dropdown to switch shops.
 * Hidden when there is nothing to switch between.
 */
export default function StudioShopPicker() {
  const { shops, activeShop, activeShopId, setActiveShopId, isReady } = useShops();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setIsOpen(false));

  if (!isReady || shops.length <= 1) return null;

  const isAll = activeShopId === "all" || !activeShop;
  const label = isAll ? "All Shops" : activeShop.name;
  const color = isAll ? ALL_COLOR : activeShop.color;

  const option = (id: string, optionLabel: string, optionColor: string, icon: React.ReactNode) => {
    const isActive = activeShopId === id;
    return (
      <button
        key={id}
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={() => {
          setActiveShopId(id);
          setIsOpen(false);
        }}
        className={`w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[0.85rem] font-semibold transition-colors ${
          isActive ? "bg-orange-50 text-orange-700" : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <IconTile color={optionColor}>{icon}</IconTile>
        <span className="flex-1 truncate">{optionLabel}</span>
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
        aria-label={`Studio: ${label}. Change shop`}
        className={`h-[45px] inline-flex items-center gap-2 rounded-full border bg-white pl-1.5 pr-1.5 sm:pr-3.5 shadow-sm transition-colors max-w-[220px] ${
          isOpen ? "border-orange-300 ring-2 ring-orange-500/15" : "border-gray-200 hover:bg-slate-50 hover:border-slate-300"
        }`}
      >
        <IconTile color={color} size="w-[33px] h-[33px] rounded-full text-base">
          {isAll ? <i className="ph-bold ph-squares-four" /> : <ShopIcon icon={activeShop.icon} />}
        </IconTile>
        <span className="hidden sm:flex flex-col items-start leading-tight min-w-0">
          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Studio</span>
          <span className="text-[0.8rem] font-bold text-slate-800 truncate max-w-[150px]">{label}</span>
        </span>
        <i
          aria-hidden="true"
          className={`ph-bold ph-caret-down text-[0.65rem] text-slate-400 hidden sm:block transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[240px] rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-top-1">
          <div className="px-2 pt-1 pb-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">Studio</div>
          <div id="studio-shop-list" role="listbox" aria-label="Select studio shop" className="flex flex-col gap-0.5">
            {option("all", "All Shops", ALL_COLOR, <i className="ph-bold ph-squares-four" />)}
            {shops.map((shop) => option(shop.id, shop.name, shop.color, <ShopIcon icon={shop.icon} />))}
          </div>
        </div>
      )}
    </div>
  );
}
