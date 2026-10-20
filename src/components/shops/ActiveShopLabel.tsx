"use client";

import { useShops } from "@/components/providers/ShopProvider";
import { ShopDot } from "./ShopBadge";

/** "Viewing: All Shops" / "Viewing: ● 🏪 Main Studio" for page headers. */
export default function ActiveShopLabel({ className = "" }: { className?: string }) {
  const { activeShop, activeShopId, isReady, shops } = useShops();
  if (!isReady || shops.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm ${className}`}>
      <span className="text-slate-400 font-semibold">Viewing:</span>
      {activeShopId === "all" || !activeShop ? (
        <>
          <i className="ph-bold ph-storefront text-slate-500" />
          All Shops
        </>
      ) : (
        <>
          <ShopDot color={activeShop.color} className="w-2 h-2" />
          {activeShop.icon && <span className="leading-none">{activeShop.icon}</span>}
          <span className="max-w-[160px] truncate">{activeShop.name}</span>
        </>
      )}
    </span>
  );
}
