"use client";

import { cn } from "@/lib/utils";

export const INVENTORY_TABS = [
  { id: "overview", label: "Overview", icon: "squares-four" },
  { id: "products", label: "Products", icon: "package" },
  { id: "sales", label: "Sales", icon: "shopping-cart" },
  { id: "purchases", label: "Purchases", icon: "truck" },
  { id: "credit", label: "Credit", icon: "hand-coins" },
  { id: "produce", label: "Produce", icon: "plant" },
] as const;

export type InventoryTab = (typeof INVENTORY_TABS)[number]["id"];

export const isInventoryTab = (value: unknown): value is InventoryTab =>
  typeof value === "string" && INVENTORY_TABS.some((t) => t.id === value);

/** Segmented tab control in the style of the Daily Kanakku tabs. */
export default function InventoryTabs({ value, onChange }: { value: InventoryTab; onChange: (tab: InventoryTab) => void }) {
  return (
    <div role="tablist" aria-label="Inventory sections" className="grid grid-cols-3 gap-0.5 md:flex md:items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-full md:w-auto">
      {INVENTORY_TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "md:flex-none shrink-0 min-w-0 px-2 md:px-5 py-2.5 rounded-xl font-bold text-[13px] sm:text-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
              active ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <i className={`ph-bold ph-${tab.icon} hidden sm:inline`} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
