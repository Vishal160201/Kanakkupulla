"use client";

import type { InventoryBill } from "@/types/inventory";
import { Pill } from "../InventoryUI";
import { formatDate, formatINR } from "../inventoryUtils";
import { cn } from "@/lib/utils";

/** One sale / purchase bill in a list. */
export default function BillRow({ bill, onOpen, showKind = false }: { bill: InventoryBill; onOpen: (id: string) => void; showKind?: boolean }) {
  const isSale = bill.kind === "SALE";
  const voided = !!bill.voidedAt;
  const party = isSale ? bill.customer?.name ?? "Walk-in customer" : bill.supplierName || "Supplier not set";

  return (
    <button
      type="button"
      onClick={() => onOpen(bill.id)}
      className="w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            voided ? "bg-slate-100 text-slate-400" : isSale ? "bg-orange-50 text-orange-500" : "bg-sky-50 text-sky-600"
          )}
        >
          <i className={`ph-bold ${isSale ? "ph-shopping-cart" : "ph-truck"} text-lg`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className={cn("font-bold text-sm truncate", voided ? "text-slate-400 line-through" : "text-slate-900")}>{party}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span className="font-mono text-slate-500">{bill.billNumber}</span>
            <span>&middot; {formatDate(bill.date)}</span>
            <span className="hidden sm:inline">&middot; {bill.lineCount} item{bill.lineCount === 1 ? "" : "s"}</span>
            {showKind && <Pill tone={isSale ? "orange" : "blue"}>{isSale ? "Sale" : "Purchase"}</Pill>}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn("text-sm font-extrabold", voided ? "text-slate-400 line-through" : isSale ? "text-emerald-600" : "text-slate-900")}>
          {formatINR(bill.totalAmount)}
        </div>
        <div className="mt-0.5 flex justify-end gap-1">
          {voided ? (
            <Pill tone="slate" icon="prohibit">Voided</Pill>
          ) : isSale && bill.dueAmount > 0 ? (
            <Pill tone="red">Due {formatINR(bill.dueAmount)}</Pill>
          ) : isSale ? (
            <Pill tone="green">Paid</Pill>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">{bill.paymentMode}</span>
          )}
        </div>
      </div>
    </button>
  );
}
