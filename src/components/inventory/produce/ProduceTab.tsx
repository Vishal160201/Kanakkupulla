"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ProduceItem } from "@/types/inventory";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  KpiCard,
  ListSkeleton,
  Pagination,
  Pill,
  SearchInput,
  cardClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../InventoryUI";
import { errorMessage, formatDate, formatINR, sendJson, useCanManageInventory, useDebouncedValue, useRevalidateInventory } from "../inventoryUtils";
import { useProduceBuyers, useProduceCollections, useProduceFarmers, useProduceItems, useProduceSales, useProduceSummary } from "../useInventoryData";
import FarmerProduceDialog from "./FarmerProduceDialog";
import BuyerDialog from "./BuyerDialog";
import BuyerFormDialog from "./BuyerFormDialog";
import CropFormDialog from "./CropFormDialog";
import { CollectionRow, ProduceSaleRow, formatQuantity, initials } from "./produceShared";
import { cn } from "@/lib/utils";

export type ProduceSection = "collections" | "farmers" | "buyers" | "crops";

const SECTIONS: { id: ProduceSection; label: string; icon: string }[] = [
  { id: "collections", label: "Collections", icon: "basket" },
  { id: "farmers", label: "Farmers", icon: "users-three" },
  { id: "buyers", label: "Buyers", icon: "storefront" },
  { id: "crops", label: "Crops", icon: "plant" },
];

/** "" means every crop. */
const ALL_CROPS = "";

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
export function ProduceKpis({ shopId, itemId = ALL_CROPS, onSection }: { shopId: string; itemId?: string; onSection?: (section: ProduceSection) => void }) {
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

function CollectionsSection({ shopId, itemId, onCollect, onOpenFarmer }: { shopId: string; itemId: string; onCollect?: () => void; onOpenFarmer: (id: string) => void }) {
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

function FarmersSection({ shopId, onOpenFarmer }: { shopId: string; onOpenFarmer: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [onlyOwed, setOnlyOwed] = useState(true);
  const debounced = useDebouncedValue(search);
  const { data, error, isLoading, isValidating, mutate } = useProduceFarmers(shopId, debounced);
  const all = useMemo(() => data?.farmers ?? [], [data]);
  // "All" lists farmers with any produce (or every match while searching)
  const farmers = useMemo(
    () => all.filter((f) => (onlyOwed ? f.produceDue > 0 : f.collections > 0 || f.produceDue !== 0 || !!debounced)),
    [all, onlyOwed, debounced]
  );
  const totalOwed = farmers.reduce((sum, f) => sum + Math.max(0, f.produceDue), 0);

  return (
    <div className={cn(cardClass, "p-4 sm:p-5")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or village" />
        <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-11 sm:ml-auto" role="radiogroup" aria-label="Farmer filter">
          {[true, false].map((owed) => (
            <button
              key={String(owed)}
              type="button"
              role="radio"
              aria-checked={onlyOwed === owed}
              onClick={() => setOnlyOwed(owed)}
              className={cn("flex-1 sm:flex-none px-3 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap", onlyOwed === owed ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
            >
              {owed ? "To pay" : "All with produce"}
            </button>
          ))}
        </div>
      </div>

      {data && farmers.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-rose-50/60 border border-rose-100 px-4 py-2.5">
          <span className="text-xs font-bold text-rose-700 min-w-0 truncate">
            {farmers.length} farmer{farmers.length === 1 ? "" : "s"}{onlyOwed ? " to pay" : ""}
            {isValidating && <i className="ph ph-circle-notch animate-spin ml-2" aria-hidden="true" />}
          </span>
          <span className="text-sm font-extrabold text-rose-700 whitespace-nowrap">{formatINR(totalOwed)}</span>
        </div>
      )}

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <ListSkeleton />
      ) : farmers.length === 0 ? (
        debounced ? (
          <EmptyState icon="magnifying-glass" title="No matching farmers" message={`Nothing matches "${debounced}".`} />
        ) : onlyOwed && all.some((f) => f.collections > 0) ? (
          <EmptyState
            icon="check-circle"
            title="Every farmer is paid"
            message="You don't owe anyone for produce right now."
            action={
              <button type="button" onClick={() => setOnlyOwed(false)} className="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100">
                Show all farmers
              </button>
            }
          />
        ) : (
          <EmptyState icon="users-three" title="No produce farmers yet" message="Farmers appear here once you collect produce from them. They're the same farmers as in Credit." />
        )
      ) : (
        <ul className="space-y-1">
          {farmers.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onOpenFarmer(f.id)}
                className="w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-extrabold", f.produceDue > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500")}>
                    {initials(f.name) || <i className="ph-bold ph-user" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{f.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {f.crops.length > 0 ? f.crops.join(", ") : "No produce yet"}
                      {f.place && <> &middot; {f.place}</>}
                      {f.lastCollection && <span className="hidden sm:inline"> &middot; Last {formatDate(f.lastCollection)}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {f.produceDue > 0 ? (
                    <>
                      <div className="text-sm font-extrabold text-rose-600 whitespace-nowrap">{formatINR(f.produceDue)}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To pay</div>
                    </>
                  ) : (
                    <Pill tone="green">Paid</Pill>
                  )}
                  {f.fertilizerCredit > 0 && (
                    <div className="mt-0.5 flex justify-end">
                      <Pill tone="blue">Credit {formatINR(f.fertilizerCredit, { decimals: false })}</Pill>
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BuyersSection({ shopId, itemId, onSell }: { shopId: string; itemId: string; onSell?: () => void }) {
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

const iconBtn = "h-8 w-8 flex items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800";

function CropsSection({ shopId }: { shopId: string }) {
  const canManage = useCanManageInventory();
  const revalidate = useRevalidateInventory();
  const { data, error, isLoading, mutate } = useProduceItems(shopId);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ProduceItem | "new" | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProduceItem | null>(null);
  const [busy, setBusy] = useState(false);
  const all = data?.items ?? [];
  const archivedCount = all.filter((i) => i.isArchived).length;
  const items = all.filter((i) => i.isArchived === showArchived);

  const toggleArchive = async (item: ProduceItem) => {
    setBusy(true);
    try {
      await sendJson(`/api/inventory/produce/items/${encodeURIComponent(item.id)}`, "PUT", { isArchived: !item.isArchived });
      toast.success(item.isArchived ? `${item.name} restored` : `${item.name} archived`, {
        description: item.isArchived ? "It's back in the crop pickers." : "Hidden from new collections and sales.",
      });
      setArchiveTarget(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(cardClass, "p-4 sm:p-5")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-950 tracking-tight">Your crops</h2>
          <p className="text-xs font-medium text-slate-400">Crops you buy from farmers. Quantities and rates use each crop&apos;s unit.</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {archivedCount > 0 && (
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-11" role="radiogroup" aria-label="Crop status">
              {[false, true].map((archived) => (
                <button
                  key={String(archived)}
                  type="button"
                  role="radio"
                  aria-checked={showArchived === archived}
                  onClick={() => setShowArchived(archived)}
                  className={cn("px-3 rounded-lg text-xs sm:text-sm font-bold transition-all", showArchived === archived ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                >
                  {archived ? `Archived (${archivedCount})` : "Active"}
                </button>
              ))}
            </div>
          )}
          {canManage && (
            <button type="button" onClick={() => setEditing("new")} className={cn(primaryButtonClass, "flex-1 sm:flex-none")}>
              <i className="ph-bold ph-plus" /> Add crop
            </button>
          )}
        </div>
      </div>
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <ListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="plant"
          title={showArchived ? "No archived crops" : "No crops yet"}
          message={showArchived ? undefined : "Add the crops farmers bring you, with the unit you weigh them in."}
          action={!showArchived && canManage && (
            <button type="button" onClick={() => setEditing("new")} className={primaryButtonClass}>
              <i className="ph-bold ph-plus" /> Add crop
            </button>
          )}
        />
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.isArchived ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600")}>
                  <i className="ph-bold ph-plant text-lg" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{item.name}</div>
                  <div className="text-[11px] font-semibold text-slate-400 truncate">Rates per {item.unit}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="text-right mr-1">
                  <div className={cn("text-sm font-extrabold whitespace-nowrap", item.stock > 0 ? "text-slate-900" : "text-slate-400")}>{formatQuantity(item.stock, item.unit)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In stock</div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!item.isArchived && (
                      <Tooltip content="Edit">
                        <button type="button" aria-label={`Edit ${item.name}`} className={iconBtn} onClick={() => setEditing(item)}>
                          <i className="ph-bold ph-pencil-simple" />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content={item.isArchived ? "Restore" : "Archive"}>
                      <button
                        type="button"
                        aria-label={`${item.isArchived ? "Restore" : "Archive"} ${item.name}`}
                        className={iconBtn}
                        disabled={busy}
                        onClick={() => (item.isArchived ? void toggleArchive(item) : setArchiveTarget(item))}
                      >
                        <i className={`ph-bold ${item.isArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}`} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <CropFormDialog shopId={shopId} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!archiveTarget}
        title={`Archive ${archiveTarget?.name ?? "crop"}?`}
        message="It's hidden from new collections and sales. Past records stay. You can restore it any time."
        confirmLabel="Archive"
        busyLabel="Archiving…"
        icon="archive"
        tone="neutral"
        busy={busy}
        onConfirm={() => archiveTarget && void toggleArchive(archiveTarget)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}

/** Produce bought from farmers and sold to buyers, per crop. */
export default function ProduceTab({ shopId, onCollect, onSell }: { shopId: string; onCollect?: () => void; onSell?: () => void }) {
  const [section, setSection] = useState<ProduceSection>("collections");
  const [itemId, setItemId] = useState(ALL_CROPS);
  const [farmerId, setFarmerId] = useState<string | null>(null);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="tablist" aria-label="Produce sections" className="grid grid-cols-4 sm:inline-flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-full sm:w-auto">
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

      <ProduceKpis shopId={shopId} itemId={itemId} onSection={setSection} />

      {section === "collections" && <CollectionsSection shopId={shopId} itemId={itemId} onCollect={onCollect} onOpenFarmer={setFarmerId} />}
      {section === "farmers" && <FarmersSection shopId={shopId} onOpenFarmer={setFarmerId} />}
      {section === "buyers" && <BuyersSection shopId={shopId} itemId={itemId} onSell={onSell} />}
      {section === "crops" && <CropsSection shopId={shopId} />}

      {farmerId && <FarmerProduceDialog shopId={shopId} customerId={farmerId} onClose={() => setFarmerId(null)} />}
    </div>
  );
}
