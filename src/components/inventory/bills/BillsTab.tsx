"use client";

import { useState } from "react";
import type { BillKind } from "@/types/inventory";
import { EmptyState, ErrorState, ListSkeleton, Pagination, SearchInput, cardClass, primaryButtonClass } from "../InventoryUI";
import { errorMessage, useDebouncedValue } from "../inventoryUtils";
import { useInventoryBills } from "../useInventoryData";
import BillRow from "./BillRow";
import BillDetailDialog from "./BillDetailDialog";
import { cn } from "@/lib/utils";

interface BillsTabProps {
  shopId: string;
  kind: BillKind;
  /** Omitted without Inventory Manage. */
  onNew?: () => void;
}

/** Paginated, searchable list of sale or purchase bills. */
export default function BillsTab({ shopId, kind, onNew }: BillsTabProps) {
  const isSale = kind === "SALE";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openBillId, setOpenBillId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const { data, error, isLoading, isValidating, mutate } = useInventoryBills(shopId, kind, page, debouncedSearch);

  const bills = data?.bills ?? [];

  return (
    <div className={cn(cardClass, "p-4 sm:p-5")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={isSale ? "Search bill no. or customer" : "Search bill no. or supplier"}
        />
        <div className="sm:ml-auto flex items-center gap-3">
          {isValidating && data && <i className="ph ph-circle-notch animate-spin text-slate-400" aria-label="Refreshing" />}
          <span className="text-xs font-bold text-slate-400">{data ? `${data.total} bill${data.total === 1 ? "" : "s"}` : ""}</span>
        </div>
      </div>

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <ListSkeleton />
      ) : bills.length === 0 ? (
        debouncedSearch ? (
          <EmptyState icon="magnifying-glass" title="No matching bills" message={`Nothing matches "${debouncedSearch}".`} />
        ) : (
          <EmptyState
            icon={isSale ? "shopping-cart" : "truck"}
            title={isSale ? "No sales yet" : "No purchases yet"}
            message={isSale ? "Sales you record reduce stock and post to Daily Kanakku." : "Record stock you buy from suppliers to build up inventory."}
            action={
              onNew && (
                <button type="button" onClick={onNew} className={primaryButtonClass}>
                  <i className="ph-bold ph-plus" /> {isSale ? "New sale" : "New purchase"}
                </button>
              )
            }
          />
        )
      ) : (
        <>
          <ul className="space-y-1">
            {bills.map((bill) => (
              <li key={bill.id}>
                <BillRow bill={bill} onOpen={setOpenBillId} />
              </li>
            ))}
          </ul>
          <Pagination page={data?.page ?? page} pageSize={data?.pageSize ?? 20} total={data?.total ?? 0} onPageChange={setPage} disabled={isValidating} />
        </>
      )}

      {openBillId && <BillDetailDialog billId={openBillId} onClose={() => setOpenBillId(null)} />}
    </div>
  );
}
