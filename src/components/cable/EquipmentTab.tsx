"use client";

import { useState } from "react";
import ProductsTab from "@/components/inventory/products/ProductsTab";
import BillsTab from "@/components/inventory/bills/BillsTab";
import BillFormDialog from "@/components/inventory/bills/BillFormDialog";
import { useCanManageInventory } from "@/components/inventory/inventoryUtils";
import { cn } from "@/lib/utils";

/**
 * Equipment stock (ONTs, routers, set-top boxes, fibre cable) using the shop inventory: products with
 * stock, purchases (posted to Daily Kanakku as Stock Purchase), and stock adjustments for installations.
 */
export default function EquipmentTab({ shopId }: { shopId: string }) {
  const [view, setView] = useState<"stock" | "purchases">("stock");
  const [buying, setBuying] = useState(false);
  const canManage = useCanManageInventory();
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="grid grid-cols-2 sm:flex bg-slate-50 border border-slate-200 rounded-xl p-1" role="radiogroup" aria-label="Equipment view">
          {(["stock", "purchases"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold", view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
            >
              {v === "stock" ? "Stock" : "Purchases"}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-slate-400 sm:ml-2 flex-1">Use Adjust stock on an item to take it out for an installation.</p>
      </div>
      {view === "stock" ? <ProductsTab shopId={shopId} /> : <BillsTab shopId={shopId} kind="PURCHASE" onNew={canManage ? () => setBuying(true) : undefined} />}
      {buying && canManage && <BillFormDialog key={`${shopId}-purchase`} shopId={shopId} kind="PURCHASE" onClose={() => setBuying(false)} />}
    </div>
  );
}
