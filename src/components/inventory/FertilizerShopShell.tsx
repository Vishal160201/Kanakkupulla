"use client";

import { useShops } from "@/components/providers/ShopProvider";
import ShopIcon from "@/components/shops/ShopIcon";
import { EmptyState, cardClass } from "./InventoryUI";
import InventorySkeleton from "./InventorySkeleton";

/**
 * Frame for the fertilizer-shop pages (Fertilizer Inventory, Farmers, Produce): waits for the
 * active shop, explains when it isn't a fertilizer shop, and shows which shop this is with the
 * page's main actions. Content is keyed by shop so switching shops resets its state.
 */
export default function FertilizerShopShell({
  pageName,
  eyebrow,
  actions,
  children,
}: {
  pageName: string;
  eyebrow: string;
  actions?: React.ReactNode;
  children: (shopId: string) => React.ReactNode;
}) {
  const { activeShop, activeShopId, activeShopType, isReady } = useShops();

  if (!isReady) return <InventorySkeleton />;

  if (!activeShop || activeShopId === "all" || activeShopType !== "FERTILIZER") {
    return (
      <div className={`${cardClass} max-w-lg mx-auto mt-6`}>
        <EmptyState
          icon="plant"
          title="Select a fertilizer shop from the Studio menu"
          message={`${pageName} is available for fertilizer shops only. Switch shops from the menu next to your avatar.`}
        />
      </div>
    );
  }

  return (
    <div className="w-full pb-20 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        {/* The page title is already in the top bar; show which shop this is */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: `${activeShop.color}1f`, color: activeShop.color }}
          >
            <ShopIcon icon={activeShop.icon} />
          </span>
          <div className="min-w-0">
            <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">{eyebrow}</div>
            <div className="truncate text-lg font-extrabold text-slate-900">{activeShop.name}</div>
          </div>
        </div>
        {actions && <div className="grid grid-cols-2 sm:flex gap-2.5 w-full sm:w-auto">{actions}</div>}
      </div>
      <div key={activeShop.id}>{children(activeShop.id)}</div>
    </div>
  );
}
