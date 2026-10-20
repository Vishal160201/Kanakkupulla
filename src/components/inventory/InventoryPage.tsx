"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BillKind } from "@/types/inventory";
import InventoryTabs, { isInventoryTab, type InventoryTab } from "./InventoryTabs";
import OverviewTab from "./OverviewTab";
import ProductsTab from "./products/ProductsTab";
import BillsTab from "./bills/BillsTab";
import BillFormDialog from "./bills/BillFormDialog";
import { primaryButtonClass, secondaryButtonClass } from "./InventoryUI";
import { useCanManageInventory } from "./inventoryUtils";
import FertilizerShopShell from "./FertilizerShopShell";
import PermissionTooltip from "@/components/shared/PermissionTooltip";

/** Fertilizer Inventory for the active (FERTILIZER) shop. */
export default function InventoryPage() {
  // ?tab= opens a tab directly (e.g. Sales, from a link).
  const tabParam = useSearchParams().get("tab");
  const [tab, setTab] = useState<InventoryTab>(isInventoryTab(tabParam) ? tabParam : "overview");
  const [seenTabParam, setSeenTabParam] = useState(tabParam);
  if (tabParam !== seenTabParam) {
    setSeenTabParam(tabParam);
    if (isInventoryTab(tabParam)) setTab(tabParam);
  }
  const [newBill, setNewBill] = useState<BillKind | null>(null);
  const canManage = useCanManageInventory();

  return (
    <FertilizerShopShell
      pageName="Fertilizer Inventory"
      eyebrow="Stock & sales"
      actions={
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
      }
    >
      {(shopId) => (
        <>
          <div className="mb-5 sm:mb-6">
            <InventoryTabs value={tab} onChange={setTab} />
          </div>

          {tab === "overview" && <OverviewTab shopId={shopId} onNavigate={setTab} />}
          {tab === "products" && <ProductsTab shopId={shopId} />}
          {tab === "sales" && <BillsTab shopId={shopId} kind="SALE" onNew={canManage ? () => setNewBill("SALE") : undefined} />}
          {tab === "purchases" && <BillsTab shopId={shopId} kind="PURCHASE" onNew={canManage ? () => setNewBill("PURCHASE") : undefined} />}

          {newBill && canManage && (
            <BillFormDialog
              key={`${shopId}-${newBill}`}
              shopId={shopId}
              kind={newBill}
              onClose={() => setNewBill(null)}
            />
          )}
        </>
      )}
    </FertilizerShopShell>
  );
}
