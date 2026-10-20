"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, KpiCard, ListSkeleton, cardClass } from "./InventoryUI";
import { LOW_STOCK_THRESHOLD, errorMessage, formatINR, formatQty, packLabel, quantityUnit } from "./inventoryUtils";
import { useInventoryBills, useInventoryProducts, useInventorySummary } from "./useInventoryData";
import { StockPill } from "./products/ProductsTab";
import ProductDetailDialog from "./products/ProductDetailDialog";
import BillRow from "./bills/BillRow";
import BillDetailDialog from "./bills/BillDetailDialog";
import type { InventoryTab } from "./InventoryTabs";
import { ProduceKpis } from "./produce/ProduceView";
import { cn } from "@/lib/utils";

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4 animate-pulse" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[110px] sm:h-[130px] rounded-2xl bg-slate-200/70" />
      ))}
    </div>
  );
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-base font-black text-slate-950 tracking-tight">{title}</h2>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
          {actionLabel} <i className="ph-bold ph-arrow-right" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function OverviewTab({ shopId, onNavigate }: { shopId: string; onNavigate: (tab: InventoryTab) => void }) {
  const router = useRouter();
  const summary = useInventorySummary(shopId);
  const products = useInventoryProducts(shopId);
  const sales = useInventoryBills(shopId, "SALE", 1, "");
  const purchases = useInventoryBills(shopId, "PURCHASE", 1, "");
  const [productId, setProductId] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);

  const lowStock = useMemo(
    () =>
      (products.data?.products ?? [])
        .filter((p) => !p.isArchived && p.stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
        .slice(0, 6),
    [products.data]
  );

  const recentBills = useMemo(
    () =>
      [...(sales.data?.bills ?? []), ...(purchases.data?.bills ?? [])]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.billNumber.localeCompare(a.billNumber))
        .slice(0, 6),
    [sales.data, purchases.data]
  );

  const s = summary.data;

  return (
    <div className="space-y-5 sm:space-y-6">
      {summary.error ? (
        <div className={cardClass}>
          <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.mutate()} />
        </div>
      ) : !s ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
          <KpiCard label="Stock value" value={formatINR(s.stockValue, { decimals: false })} hint="At selling price" icon="coins" iconClass="bg-amber-50 text-amber-600" onClick={() => onNavigate("products")} />
          <KpiCard label="Products" value={String(s.productCount)} hint="Active products" icon="package" iconClass="bg-emerald-50 text-emerald-600" onClick={() => onNavigate("products")} />
          <KpiCard
            label="Out of stock"
            value={String(s.outOfStockCount)}
            hint={s.outOfStockCount > 0 ? "Restock soon" : "All in stock"}
            icon="warning-circle"
            iconClass="bg-rose-50 text-rose-500"
            highlight={s.outOfStockCount > 0}
            onClick={() => onNavigate("products")}
          />
          <KpiCard label="Today's sales" value={formatINR(s.todaySales, { decimals: false })} hint="Billed today" icon="shopping-cart" iconClass="bg-orange-50 text-orange-500" onClick={() => onNavigate("sales")} />
          <KpiCard label="Today's purchases" value={formatINR(s.todayPurchases, { decimals: false })} hint="Bought today" icon="truck" iconClass="bg-sky-50 text-sky-600" onClick={() => onNavigate("purchases")} />
          <KpiCard
            label="Credit outstanding"
            value={formatINR(s.creditOutstanding, { decimals: false })}
            hint={`${s.customersWithDues} farmer${s.customersWithDues === 1 ? "" : "s"} with dues`}
            icon="hand-coins"
            iconClass="bg-violet-50 text-violet-600"
            highlight={s.creditOutstanding > 0}
            onClick={() => router.push("/farmers?filter=owe-you")}
          />
        </div>
      )}

      <section>
        <SectionHeader title="Produce" actionLabel="Open produce" onAction={() => router.push("/produce")} />
        <ProduceKpis
          shopId={shopId}
          onSection={(section) => router.push(section === "farmers" ? "/farmers?filter=you-owe" : `/produce?section=${section}`)}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
        <section className={cn(cardClass, "p-4 sm:p-5")}>
          <SectionHeader title="Low / out of stock" actionLabel="All products" onAction={() => onNavigate("products")} />
          {products.error ? (
            <ErrorState message={errorMessage(products.error)} onRetry={() => products.mutate()} />
          ) : !products.data ? (
            <ListSkeleton rows={3} />
          ) : lowStock.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title={products.data.products.length === 0 ? "No products yet" : "Stock looks healthy"}
              message={products.data.products.length === 0 ? "Add products to start tracking stock." : `No product is at or below ${LOW_STOCK_THRESHOLD} units.`}
              className="py-8"
            />
          ) : (
            <ul className="space-y-1">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setProductId(p.id)}
                    className="w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", p.stock <= 0 ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-600")}>
                        <i className="ph-bold ph-package" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">{p.name}</div>
                        <div className="text-[11px] font-semibold text-slate-400 truncate">{packLabel(p)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-sm font-extrabold", p.stock <= 0 ? "text-rose-600" : "text-slate-900")}>
                        {formatQty(p.stock)} <span className="text-xs text-slate-400">{quantityUnit(p, p.stock)}</span>
                      </span>
                      <StockPill product={p} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cn(cardClass, "p-4 sm:p-5")}>
          <SectionHeader title="Recent bills" actionLabel="All sales" onAction={() => onNavigate("sales")} />
          {sales.error || purchases.error ? (
            <ErrorState
              message={errorMessage(sales.error ?? purchases.error)}
              onRetry={() => {
                void sales.mutate();
                void purchases.mutate();
              }}
            />
          ) : !sales.data || !purchases.data ? (
            <ListSkeleton rows={3} />
          ) : recentBills.length === 0 ? (
            <EmptyState icon="receipt" title="No bills yet" message="Sales and purchases you record will show up here." className="py-8" />
          ) : (
            <ul className="space-y-1">
              {recentBills.map((bill) => (
                <li key={bill.id}>
                  <BillRow bill={bill} onOpen={setBillId} showKind />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {productId && <ProductDetailDialog shopId={shopId} productId={productId} onClose={() => setProductId(null)} />}
      {billId && <BillDetailDialog billId={billId} onClose={() => setBillId(null)} />}
    </div>
  );
}
