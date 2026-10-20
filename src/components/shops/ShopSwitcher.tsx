"use client";

import { useShops } from "@/components/providers/ShopProvider";
import { ShopDot } from "./ShopBadge";

const pillBase =
  "shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-bold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300";
const pillActive = "bg-slate-900 border-slate-900 text-white shadow-md";
const pillIdle = "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900";

/**
 * "All Shops" + one pill per active shop. Scrolls horizontally on small screens
 * and renders nothing when there is at most one active shop.
 */
export default function ShopSwitcher({ className = "" }: { className?: string }) {
  const { shops, activeShopId, setActiveShopId, isReady } = useShops();

  if (!isReady || shops.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Filter by shop"
      className={`flex items-center gap-2 overflow-x-auto pb-1 -mb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <button
        type="button"
        aria-pressed={activeShopId === "all"}
        onClick={() => setActiveShopId("all")}
        className={`${pillBase} ${activeShopId === "all" ? pillActive : pillIdle}`}
      >
        <i className="ph-bold ph-storefront text-base" />
        All Shops
      </button>
      {shops.map((shop) => {
        const isActive = activeShopId === shop.id;
        return (
          <button
            key={shop.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setActiveShopId(shop.id)}
            className={`${pillBase} ${isActive ? pillActive : pillIdle}`}
          >
            <ShopDot color={shop.color} className={`w-2.5 h-2.5 ring-2 ${isActive ? "ring-white/30" : "ring-slate-100"}`} />
            {shop.icon && <span className="leading-none">{shop.icon}</span>}
            <span className="max-w-[160px] truncate">{shop.name}</span>
          </button>
        );
      })}
    </div>
  );
}
