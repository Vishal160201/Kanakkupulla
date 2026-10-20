"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PermissionTooltip from "@/components/shared/PermissionTooltip";
import { primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { useCanManageInventory } from "../inventoryUtils";
import FertilizerShopShell from "../FertilizerShopShell";
import ProduceView, { type ProduceSection } from "./ProduceView";
import CollectionFormDialog from "./CollectionFormDialog";
import ProduceSaleFormDialog from "./ProduceSaleFormDialog";

const isProduceSection = (value: unknown): value is ProduceSection => value === "collections" || value === "buyers" || value === "crops";

/** Produce trade of the active fertilizer shop: crops collected from farmers and sold to buyers. */
export default function ProducePage() {
  const router = useRouter();
  const sectionParam = useSearchParams().get("section");
  const [newProduce, setNewProduce] = useState<"collection" | "sale" | null>(null);
  const canManage = useCanManageInventory();

  return (
    <FertilizerShopShell
      pageName="Produce"
      eyebrow="Produce trade"
      actions={
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
      }
    >
      {(shopId) => (
        <>
          <ProduceView
            // Remount when a link asks for another section
            key={sectionParam ?? "collections"}
            shopId={shopId}
            initialSection={isProduceSection(sectionParam) ? sectionParam : "collections"}
            onCollect={canManage ? () => setNewProduce("collection") : undefined}
            onSell={canManage ? () => setNewProduce("sale") : undefined}
            onOpenFarmers={() => router.push("/farmers?filter=you-owe")}
          />
          {newProduce === "collection" && canManage && <CollectionFormDialog key={`${shopId}-collection`} shopId={shopId} onClose={() => setNewProduce(null)} />}
          {newProduce === "sale" && canManage && <ProduceSaleFormDialog key={`${shopId}-produce-sale`} shopId={shopId} onClose={() => setNewProduce(null)} />}
        </>
      )}
    </FertilizerShopShell>
  );
}
