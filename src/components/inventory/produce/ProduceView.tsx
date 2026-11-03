"use client";

import { useState } from "react";
import FarmerDetailDialog from "../farmers/FarmerDetailDialog";
import { cn } from "@/lib/utils";
import { ALL_CROPS, CropFilter, ProduceKpis, type ProduceSection } from "./ProduceKpis";
import CollectionsSection from "./CollectionsSection";
import BuyersSection from "./BuyersSection";
import CropsSection from "./CropsSection";

export type { ProduceKpiTarget, ProduceSection } from "./ProduceKpis";

const SECTIONS: { id: ProduceSection; label: string; icon: string }[] = [
  { id: "collections", label: "Collections", icon: "basket" },
  { id: "buyers", label: "Buyers", icon: "storefront" },
  { id: "crops", label: "Crops", icon: "plant" },
];

/** Produce bought from farmers and sold to buyers, per crop. Farmer dues live on the Farmers page. */
export default function ProduceView({
  shopId,
  initialSection = "collections",
  onCollect,
  onSell,
  onOpenFarmers,
}: {
  shopId: string;
  initialSection?: ProduceSection;
  onCollect?: () => void;
  onSell?: () => void;
  onOpenFarmers: () => void;
}) {
  const [section, setSection] = useState<ProduceSection>(initialSection);
  const [itemId, setItemId] = useState(ALL_CROPS);
  const [farmerId, setFarmerId] = useState<string | null>(null);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="tablist" aria-label="Produce sections" className="grid grid-cols-3 sm:inline-flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-full sm:w-auto">
          {SECTIONS.map((s) => {
            const active = s.id === section;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSection(s.id)}
                className={cn(
                  "px-1.5 sm:px-4 py-2 rounded-xl font-bold text-[12px] sm:text-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0",
                  active ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <i className={`ph-bold ph-${s.icon} hidden md:inline`} aria-hidden="true" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
        <CropFilter shopId={shopId} value={itemId} onChange={setItemId} />
      </div>

      <ProduceKpis shopId={shopId} itemId={itemId} onSection={(target) => (target === "farmers" ? onOpenFarmers() : setSection(target))} />

      {section === "collections" && <CollectionsSection shopId={shopId} itemId={itemId} onCollect={onCollect} onOpenFarmer={setFarmerId} />}
      {section === "buyers" && <BuyersSection shopId={shopId} itemId={itemId} onSell={onSell} />}
      {section === "crops" && <CropsSection shopId={shopId} />}

      {farmerId && <FarmerDetailDialog shopId={shopId} customerId={farmerId} onClose={() => setFarmerId(null)} />}
    </div>
  );
}
