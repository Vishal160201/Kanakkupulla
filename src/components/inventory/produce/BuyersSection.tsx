"use client";

import { useState } from "react";
import { EmptyState, ErrorState, ListSkeleton, Pagination, Pill, SearchInput, cardClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { errorMessage, formatINR, useCanManageInventory, useDebouncedValue } from "../inventoryUtils";
import { useProduceBuyers, useProduceSales } from "../useInventoryData";
import BuyerDialog from "./BuyerDialog";
import BuyerFormDialog from "./BuyerFormDialog";
import { ProduceSaleRow, initials } from "./produceShared";
import { cn } from "@/lib/utils";

export default function BuyersSection({ shopId, itemId, onSell }: { shopId: string; itemId: string; onSell?: () => void }) {
  const canManage = useCanManageInventory();
  const [buyerSearch, setBuyerSearch] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [openBuyerId, setOpenBuyerId] = useState<string | null>(null);
  const debouncedBuyer = useDebouncedValue(buyerSearch);
  const debouncedSale = useDebouncedValue(saleSearch);
  const buyers = useProduceBuyers(shopId, debouncedBuyer);
  const sales = useProduceSales(shopId, page, debouncedSale, itemId);
  const buyerList = buyers.data?.buyers ?? [];
  const saleList = sales.data?.sales ?? [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 sm:gap-6 items-start">
      <section className={cn(cardClass, "p-4 sm:p-5 min-w-0")}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-black text-slate-950 tracking-tight">Buyers</h2>
          {canManage && (
            <button type="button" onClick={() => setAdding(true)} className={cn(secondaryButtonClass, "h-9 px-3 text-xs sm:text-sm")}>
              <i className="ph-bold ph-user-plus" /> Add buyer
            </button>
          )}
        </div>
        <div className="mb-3 [&>div]:sm:max-w-none">
          <SearchInput value={buyerSearch} onChange={setBuyerSearch} placeholder="Search buyers" />
        </div>
        {buyers.error ? (
          <ErrorState message={errorMessage(buyers.error)} onRetry={() => buyers.mutate()} />
        ) : buyers.isLoading && !buyers.data ? (
          <ListSkeleton rows={3} />
        ) : buyerList.length === 0 ? (
          <EmptyState
            icon="storefront"
            title={debouncedBuyer ? "No matching buyers" : "No buyers yet"}
            message={debouncedBuyer ? `Nothing matches "${debouncedBuyer}".` : "Add the marketers and traders you sell produce to. You can also add one while selling."}
            className="py-8"
          />
        ) : (
          <ul className="space-y-1">
            {buyerList.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setOpenBuyerId(b.id)}
                  className="w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-extrabold", b.due > 0 ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-500")}>
                      {initials(b.name) || <i className="ph-bold ph-storefront" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 truncate">{b.name}</div>
                      <div className="text-[11px] font-semibold text-slate-400 truncate">{[b.place, b.phone].filter(Boolean).join(" · ") || "No contact details"}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {b.due > 0 ? (
                      <>
                        <div className="text-sm font-extrabold text-violet-700 whitespace-nowrap">{formatINR(b.due)}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due</div>
                      </>
                    ) : (
                      <Pill tone="green">Settled</Pill>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cn(cardClass, "p-4 sm:p-5 min-w-0")}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h2 className="text-base font-black text-slate-950 tracking-tight shrink-0">Sales</h2>
          <div className="sm:ml-auto flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <SearchInput value={saleSearch} onChange={(v) => { setSaleSearch(v); setPage(1); }} placeholder="Search sale no., buyer or crop" />
            {onSell && (
              <button type="button" onClick={onSell} className={primaryButtonClass}>
                <i className="ph-bold ph-scales" /> Sell produce
              </button>
            )}
          </div>
        </div>
        {sales.error ? (
          <ErrorState message={errorMessage(sales.error)} onRetry={() => sales.mutate()} />
        ) : sales.isLoading && !sales.data ? (
          <ListSkeleton rows={3} />
        ) : saleList.length === 0 ? (
          <EmptyState
            icon="scales"
            title={debouncedSale || itemId ? "No matching sales" : "No produce sold yet"}
            message={debouncedSale ? `Nothing matches "${debouncedSale}".` : "Sell collected produce to a buyer. Unpaid amounts become their dues."}
            className="py-8"
          />
        ) : (
          <>
            <ul className={cn("space-y-1 transition-opacity", sales.isValidating && "opacity-70")}>
              {saleList.map((s) => (
                <li key={s.id}>
                  <ProduceSaleRow sale={s} onOpen={() => setOpenBuyerId(s.buyer.id)} />
                </li>
              ))}
            </ul>
            {sales.data && <Pagination page={sales.data.page} pageSize={sales.data.pageSize} total={sales.data.total} onPageChange={setPage} disabled={sales.isValidating} />}
          </>
        )}
      </section>

      {adding && <BuyerFormDialog shopId={shopId} buyer={null} onClose={() => setAdding(false)} onSaved={(b) => setOpenBuyerId(b.id)} />}
      {openBuyerId && <BuyerDialog shopId={shopId} buyerId={openBuyerId} onClose={() => setOpenBuyerId(null)} />}
    </div>
  );
}
