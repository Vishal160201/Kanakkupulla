"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShops } from "@/components/providers/ShopProvider";
import ShopIcon from "@/components/shops/ShopIcon";
import type { BillKind } from "@/types/inventory";
import InventoryTabs, { isInventoryTab, type InventoryTab } from "./InventoryTabs";
import OverviewTab from "./OverviewTab";
import ProductsTab from "./products/ProductsTab";
import BillsTab from "./bills/BillsTab";
import BillFormDialog from "./bills/BillFormDialog";
import CreditTab from "./credit/CreditTab";
import ProduceTab from "./produce/ProduceTab";
import CollectionFormDialog from "./produce/CollectionFormDialog";
import ProduceSaleFormDialog from "./produce/ProduceSaleFormDialog";
import { EmptyState, cardClass, primaryButtonClass, secondaryButtonClass } from "./InventoryUI";
import InventorySkeleton from "./InventorySkeleton";
import { useCanManageInventory } from "./inventoryUtils";
import PermissionTooltip from "@/components/shared/PermissionTooltip";

/** Fertilizer Inventory for the active (FERTILIZER) shop. */
export default function InventoryPage() {
  const { activeShop, activeShopId, activeShopType, isReady } = useShops();
  // ?tab= opens a tab directly (e.g. Credit, from Daily Kanakku's Credit Collection).
  const tabParam = useSearchParams().get("tab");
  const [tab, setTab] = useState<InventoryTab>(isInventoryTab(tabParam) ? tabParam : "overview");
  const [seenTabParam, setSeenTabParam] = useState(tabParam);
  if (tabParam !== seenTabParam) {
    setSeenTabParam(tabParam);
    if (isInventoryTab(tabParam)) setTab(tabParam);
  }
  const [newBill, setNewBill] = useState<BillKind | null>(null);
  const [newProduce, setNewProduce] = useState<"collection" | "sale" | null>(null);
  const canManage = useCanManageInventory();

  if (!isReady) return <InventorySkeleton />;

  if (!activeShop || activeShopId === "all" || activeShopType !== "FERTILIZER") {
    return (
      <div className={`${cardClass} max-w-lg mx-auto mt-6`}>
        <EmptyState
          icon="plant"
          title="Select a fertilizer shop from the Studio menu"
          message="Fertilizer Inventory is available for fertilizer shops only. Switch shops from the menu next to your avatar."
        />
      </div>
    );
  }

  const shopId = activeShop.id;

  return (
    <div className="w-full pb-20 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div className="min-w-0">
          {/* The page title is already in the top bar; show which shop this is */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: `${activeShop.color}1f`, color: activeShop.color }}
            >
              <ShopIcon icon={activeShop.icon} />
            </span>
            <div className="min-w-0">
              <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">{tab === "produce" ? "Produce trade" : "Stock & sales"}</div>
              <div className="truncate text-lg font-extrabold text-slate-900">{activeShop.name}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2.5 w-full sm:w-auto">
          {tab === "produce" ? (
            <>
              <PermissionTooltip allowed={canManage} className="flex">
                <button type="button" onClick={() => setNewProduce("sale")} disabled={!canManage} className={`${secondaryButtonClass} w-full disabled:opacity-50 disabled:pointer-events-none`}>
                  <i className="ph-bold ph-scales" /> Sell Produce
                </button>
              </PermissionTooltip>
              <PermissionTooltip allowed={canManage} className="flex">
                <button type="button" onClick={() => setNewProduce("collection")} disabled={!canManage} className={`${primaryButtonClass} w-full hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none`}>
                  <i className="ph-bold ph-basket" /> Collect Produce
                </button>
              </PermissionTooltip>
            </>
          ) : (
            <>
              <PermissionTooltip allowed={canManage} className="flex">
                <button type="button" onClick={() => setNewBill("PURCHASE")} disabled={!canManage} className={`${secondaryButtonClass} w-full disabled:opacity-50 disabled:pointer-events-none`}>
                  <i className="ph-bold ph-truck" /> New Purchase
                </button>
              </PermissionTooltip>
              <PermissionTooltip allowed={canManage} className="flex">
                <button type="button" onClick={() => setNewBill("SALE")} disabled={!canManage} className={`${primaryButtonClass} w-full hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none`}>
                  <i className="ph-bold ph-shopping-cart" /> New Sale
                </button>
              </PermissionTooltip>
            </>
          )}
        </div>
      </div>

      <div className="mb-5 sm:mb-6">
        <InventoryTabs value={tab} onChange={setTab} />
      </div>

      {/* Keyed by shop so switching shops resets search/pagination state. */}
      <div key={shopId}>
        {tab === "overview" && <OverviewTab shopId={shopId} onNavigate={setTab} />}
        {tab === "products" && <ProductsTab shopId={shopId} />}
        {tab === "sales" && <BillsTab shopId={shopId} kind="SALE" onNew={canManage ? () => setNewBill("SALE") : undefined} />}
        {tab === "purchases" && <BillsTab shopId={shopId} kind="PURCHASE" onNew={canManage ? () => setNewBill("PURCHASE") : undefined} />}
        {tab === "credit" && <CreditTab shopId={shopId} />}
        {tab === "produce" && (
          <ProduceTab
            shopId={shopId}
            onCollect={canManage ? () => setNewProduce("collection") : undefined}
            onSell={canManage ? () => setNewProduce("sale") : undefined}
          />
        )}
      </div>

      {newBill && canManage && (
        <BillFormDialog
          key={`${shopId}-${newBill}`}
          shopId={shopId}
          kind={newBill}
          onClose={() => setNewBill(null)}
        />
      )}
      {newProduce === "collection" && canManage && <CollectionFormDialog key={`${shopId}-collection`} shopId={shopId} onClose={() => setNewProduce(null)} />}
      {newProduce === "sale" && canManage && <ProduceSaleFormDialog key={`${shopId}-produce-sale`} shopId={shopId} onClose={() => setNewProduce(null)} />}
    </div>
  );
}
