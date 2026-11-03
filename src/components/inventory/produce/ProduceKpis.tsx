"use client";

import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { ErrorState, KpiCard, cardClass } from "../InventoryUI";
import { errorMessage, formatINR } from "../inventoryUtils";
import { useProduceItems, useProduceSummary } from "../useInventoryData";
import { formatQuantity } from "./produceShared";

export type ProduceSection = "collections" | "buyers" | "crops";

/** Where a produce KPI leads: a section here, or the Farmers page for farmer dues. */
export type ProduceKpiTarget = ProduceSection | "farmers";

/** "" means every crop. */
export const ALL_CROPS = "";

function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-[110px] sm:h-[130px] rounded-2xl bg-slate-200/70" />
      ))}
    </div>
  );
}

/** Crop filter in the app's dropdown style ("All crops" by default). */
export function CropFilter({ shopId, value, onChange }: { shopId: string; value: string; onChange: (itemId: string) => void }) {
  const { data } = useProduceItems(shopId);
  const options: DropdownOption[] = [
    { label: "All crops", value: ALL_CROPS, icon: "squares-four" },
    ...(data?.items ?? []).filter((i) => !i.isArchived || i.stock > 0).map((i) => ({ label: i.name, value: i.id, icon: "plant" })),
  ];
  return (
    <div className="w-full sm:w-[220px]">
      <CustomDropdown options={options} value={value} onChange={onChange} placeholder="All crops" />
    </div>
  );
}

/** Produce KPIs: stock (all crops in kg, or one crop in its unit), owed to farmers, buyer dues, today's collection. */
export function ProduceKpis({ shopId, itemId = ALL_CROPS, onSection }: { shopId: string; itemId?: string; onSection?: (target: ProduceKpiTarget) => void }) {
  const { data: s, error, mutate } = useProduceSummary(shopId);
  if (error) {
    return (
      <div className={cardClass}>
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      </div>
    );
  }
  if (!s) return <KpiStripSkeleton />;
  const item = itemId ? s.items.find((i) => i.id === itemId) ?? null : null;
  const stockedCrops = s.items.filter((i) => i.stock > 0).length;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <KpiCard
        label={item ? `${item.name} in stock` : "Produce in stock"}
        value={item ? formatQuantity(item.stock, item.unit) : formatQuantity(s.stockKg, "kg")}
        hint={item ? "Collected − sold" : `${stockedCrops} crop${stockedCrops === 1 ? "" : "s"} in stock`}
        icon="scales"
        iconClass="bg-amber-50 text-amber-600"
        onClick={onSection && (() => onSection("crops"))}
      />
      <KpiCard
        label="Owed to farmers"
        value={formatINR(s.owedToFarmers, { decimals: false })}
        hint={`${s.farmersOwed} farmer${s.farmersOwed === 1 ? "" : "s"} to pay`}
        icon="hand-arrow-up"
        iconClass="bg-rose-50 text-rose-500"
        highlight={s.owedToFarmers > 0}
        onClick={onSection && (() => onSection("farmers"))}
      />
      <KpiCard
        label="Buyer dues"
        value={formatINR(s.buyerDues, { decimals: false })}
        hint={`${s.buyersWithDues} buyer${s.buyersWithDues === 1 ? "" : "s"} owe you`}
        icon="hand-coins"
        iconClass="bg-violet-50 text-violet-600"
        onClick={onSection && (() => onSection("buyers"))}
      />
      <KpiCard
        label="Today's collection"
        value={item ? formatQuantity(item.todayQuantity, item.unit) : formatINR(s.todayCollectedAmount, { decimals: false })}
        hint={
          item
            ? item.todayCollections > 0 ? `${formatINR(item.todayAmount, { decimals: false })} · ${item.todayCollections} collection${item.todayCollections === 1 ? "" : "s"}` : "Nothing collected yet"
            : s.todayCollections > 0 ? `${s.todayCollections} collection${s.todayCollections === 1 ? "" : "s"}` : "Nothing collected yet"
        }
        icon="basket"
        iconClass="bg-emerald-50 text-emerald-600"
        onClick={onSection && (() => onSection("collections"))}
      />
    </div>
  );
}
