"use client";

import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import type { QuickAddCategory } from "./overviewData";
import { useCanWriteTransaction } from "@/hooks/useAccess";
import { useInventoryLedgerShortcut } from "@/components/inventory/useInventoryLedgerShortcut";

export default function QuickAddCategories({ categories }: { categories: QuickAddCategory[] }) {
  const { openTransactionForm } = useGlobalForm();
  // Fertilizer Sales / Stock Purchase / Credit Collection open the inventory flow instead.
  const inventoryShortcut = useInventoryLedgerShortcut();
  // Shortcuts that start a new entry in the active shop.
  const canAdd = useCanWriteTransaction()();
  if (categories.length === 0 || !canAdd) return null;

  return (
    <div className="bg-white rounded-[20px] py-4 px-4 md:px-6 shadow-sm border border-slate-100 mb-8 animate-slide-up flex flex-col justify-center w-fit mx-auto max-w-full" style={{ animationDelay: "350ms" }}>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide snap-x justify-start w-full mx-auto">
        {categories.map((qa, i) => (
          <button type="button" key={i} onClick={() => { if (!inventoryShortcut(qa.label)) openTransactionForm(undefined, { category: qa.label, type: qa.type }); }} className="flex flex-col items-center gap-2 outline-none group shrink-0 w-[65px] sm:w-[75px] snap-start bg-transparent border-none cursor-pointer">
            <div className={`w-12 h-12 rounded-[14px] ${qa.bg} ${qa.color} flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
              <i className={`ph-bold ${qa.icon} text-xl`}></i>
            </div>
            <span className="text-[0.65rem] font-bold text-[#0B1E40] leading-tight text-center">
              {qa.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
