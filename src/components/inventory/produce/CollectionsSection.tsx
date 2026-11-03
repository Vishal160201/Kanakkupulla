"use client";

import { useState } from "react";
import { EmptyState, ErrorState, ListSkeleton, Pagination, SearchInput, cardClass, primaryButtonClass } from "../InventoryUI";
import { errorMessage, useDebouncedValue } from "../inventoryUtils";
import { useProduceCollections } from "../useInventoryData";
import { CollectionRow } from "./produceShared";
import { cn } from "@/lib/utils";

export default function CollectionsSection({ shopId, itemId, onCollect, onOpenFarmer }: { shopId: string; itemId: string; onCollect?: () => void; onOpenFarmer: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const { data, error, isLoading, isValidating, mutate } = useProduceCollections(shopId, page, debounced, itemId);
  const collections = data?.collections ?? [];

  return (
    <div className={cn(cardClass, "p-4 sm:p-5")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search farmer, village or crop" />
        {onCollect && (
          <button type="button" onClick={onCollect} className={cn(primaryButtonClass, "sm:ml-auto")}>
            <i className="ph-bold ph-basket" /> Collect produce
          </button>
        )}
      </div>
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <ListSkeleton />
      ) : collections.length === 0 ? (
        debounced || itemId ? (
          <EmptyState icon="magnifying-glass" title="No matching collections" message={debounced ? `Nothing matches "${debounced}".` : "Nothing collected for this crop yet."} />
        ) : (
          <EmptyState
            icon="basket"
            title="No produce collected yet"
            message="Weigh a farmer's crop and note the day's rate. What you owe them adds up until you pay."
            action={onCollect && (
              <button type="button" onClick={onCollect} className={primaryButtonClass}>
                <i className="ph-bold ph-basket" /> Collect produce
              </button>
            )}
          />
        )
      ) : (
        <>
          <ul className={cn("space-y-1 transition-opacity", isValidating && "opacity-70")}>
            {collections.map((c) => (
              <li key={c.id}>
                <CollectionRow collection={c} onOpen={() => onOpenFarmer(c.customer.id)} />
              </li>
            ))}
          </ul>
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} disabled={isValidating} />}
        </>
      )}
    </div>
  );
}
