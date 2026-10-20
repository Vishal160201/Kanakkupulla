"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProduceFarmer } from "@/types/inventory";
import PermissionTooltip from "@/components/shared/PermissionTooltip";
import { EmptyState, ErrorState, KpiCard, ListSkeleton, cardClass, primaryButtonClass, secondaryButtonClass, SearchInput } from "../InventoryUI";
import { errorMessage, formatINR, roundMoney, useCanManageInventory, useDebouncedValue } from "../inventoryUtils";
import { useProduceFarmers } from "../useInventoryData";
import CollectionFormDialog from "../produce/CollectionFormDialog";
import { initials } from "../produce/produceShared";
import FertilizerShopShell from "../FertilizerShopShell";
import FarmerFormDialog from "./FarmerFormDialog";
import FarmerDetailDialog from "./FarmerDetailDialog";
import { cn } from "@/lib/utils";

export type FarmerFilter = "all" | "owe-you" | "you-owe" | "settled";

const FILTERS: { id: FarmerFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "owe-you", label: "Owe you" },
  { id: "you-owe", label: "You owe" },
  { id: "settled", label: "Settled" },
];

const isFarmerFilter = (value: unknown): value is FarmerFilter => typeof value === "string" && FILTERS.some((f) => f.id === value);

/** Fertilizer credit minus produce due: positive means the farmer owes the shop. */
const netOf = (f: ProduceFarmer) => roundMoney(f.fertilizerCredit - f.produceDue);

/** Each farmer lands in exactly one filter, by who owes whom overall. */
function filterOf(f: ProduceFarmer): Exclude<FarmerFilter, "all"> {
  const net = netOf(f);
  if (net > 0) return "owe-you";
  if (net < 0) return "you-owe";
  return f.fertilizerCredit > 0 ? "owe-you" : "settled";
}

/** A balance under the Credit / Produce column headings ("—" when nothing is owed). */
function Amount({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="text-right min-w-0" aria-label={`${label}: ${formatINR(value)}`}>
      <div className={cn("text-sm font-extrabold whitespace-nowrap", value > 0 ? className : "text-slate-300")}>{value > 0 ? formatINR(value) : "—"}</div>
    </div>
  );
}

function FarmerRow({ farmer, onOpen }: { farmer: ProduceFarmer; onOpen: () => void }) {
  const net = netOf(farmer);
  const details = [farmer.place, farmer.phone].filter(Boolean).join(" · ") || "No contact details";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
    >
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-extrabold",
          net > 0 ? "bg-rose-50 text-rose-600" : net < 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
        )}
      >
        {initials(farmer.name) || <i className="ph-bold ph-user" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm text-slate-900 truncate">{farmer.name}</div>
        <div className="text-[11px] font-semibold text-slate-400 truncate">
          {details}
          {farmer.crops.length > 0 && <span className="hidden sm:inline"> &middot; {farmer.crops.join(", ")}</span>}
        </div>
      </div>
      {/* Both balances from sm up; just the net on phones */}
      <div className="hidden sm:grid grid-cols-2 gap-5 shrink-0 w-[220px]">
        <Amount label="Fertilizer credit" value={farmer.fertilizerCredit} className="text-rose-600" />
        <Amount label="Produce due" value={farmer.produceDue} className="text-amber-700" />
      </div>
      <div className="text-right shrink-0 sm:w-[110px]">
        {net === 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <i className="ph-bold ph-check" aria-hidden="true" /> Settled
          </span>
        ) : (
          <>
            <div className={cn("text-sm font-extrabold whitespace-nowrap", net > 0 ? "text-rose-600" : "text-amber-700")}>{formatINR(Math.abs(net))}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{net > 0 ? "Owes you" : "You owe"}</div>
          </>
        )}
      </div>
    </button>
  );
}

function FarmersView({ shopId, filter, onFilter, onAdd }: { shopId: string; filter: FarmerFilter; onFilter: (f: FarmerFilter) => void; onAdd?: () => void }) {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const debounced = useDebouncedValue(search);
  const { data, error, isLoading, isValidating, mutate } = useProduceFarmers(shopId, debounced);

  const all = useMemo(() => data?.farmers ?? [], [data]);
  const counts = useMemo(() => {
    const c: Record<FarmerFilter, number> = { all: all.length, "owe-you": 0, "you-owe": 0, settled: 0 };
    for (const f of all) c[filterOf(f)] += 1;
    return c;
  }, [all]);
  const farmers = useMemo(
    () =>
      all
        .filter((f) => filter === "all" || filterOf(f) === filter)
        .sort((a, b) => Math.abs(netOf(b)) - Math.abs(netOf(a)) || a.name.localeCompare(b.name)),
    [all, filter]
  );
  const totals = useMemo(() => {
    const credit = roundMoney(all.reduce((sum, f) => sum + Math.max(0, f.fertilizerCredit), 0));
    const due = roundMoney(all.reduce((sum, f) => sum + Math.max(0, f.produceDue), 0));
    return { credit, due, net: roundMoney(credit - due) };
  }, [all]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Totals cover every farmer (or every search match), whatever the filter */}
      {data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            label="Farmers"
            value={String(all.length)}
            hint={`${counts["owe-you"] + counts["you-owe"]} with dues`}
            icon="users-three"
            iconClass="bg-emerald-50 text-emerald-600"
            onClick={() => onFilter("all")}
          />
          <KpiCard
            label="Fertilizer credit"
            value={formatINR(totals.credit, { decimals: false })}
            hint="Owed to you"
            icon="hand-coins"
            iconClass="bg-rose-50 text-rose-500"
            highlight={totals.credit > 0}
            onClick={() => onFilter("owe-you")}
          />
          <KpiCard
            label="Produce dues"
            value={formatINR(totals.due, { decimals: false })}
            hint="You owe for produce"
            icon="hand-arrow-up"
            iconClass="bg-amber-50 text-amber-600"
            highlight={totals.due > 0}
            onClick={() => onFilter("you-owe")}
          />
          <KpiCard
            label="Net"
            value={totals.net === 0 ? "₹0" : formatINR(Math.abs(totals.net), { decimals: false })}
            hint={totals.net > 0 ? "Farmers owe you" : totals.net < 0 ? "You owe farmers" : "All square"}
            icon="scales"
            iconClass="bg-violet-50 text-violet-600"
          />
        </div>
      ) : (
        !error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-[110px] sm:h-[130px] rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        )
      )}

      <div className={cn(cardClass, "p-4 sm:p-5")}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or village" />
          <div className="grid grid-cols-4 lg:flex bg-slate-50 border border-slate-200 rounded-xl p-1 lg:ml-auto" role="radiogroup" aria-label="Farmer filter">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={filter === f.id}
                onClick={() => onFilter(f.id)}
                className={cn(
                  "min-w-0 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap truncate",
                  filter === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {f.label}
                {data && <span className="hidden sm:inline ml-1 text-slate-400 font-semibold">{counts[f.id]}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Column headings for the balances (sm and up) */}
        {farmers.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">
            <span className="flex-1">Farmer{isValidating && <i className="ph ph-circle-notch animate-spin ml-2" aria-hidden="true" />}</span>
            <span className="w-[220px] grid grid-cols-2 gap-5 text-right"><span>Credit</span><span>Produce</span></span>
            <span className="w-[110px] text-right">Net</span>
          </div>
        )}

        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
        ) : isLoading && !data ? (
          <ListSkeleton />
        ) : farmers.length === 0 ? (
          debounced ? (
            <EmptyState icon="magnifying-glass" title="No matching farmers" message={`Nothing matches "${debounced}".`} />
          ) : all.length > 0 ? (
            <EmptyState
              icon="check-circle"
              title={filter === "owe-you" ? "No one owes you" : filter === "you-owe" ? "You don't owe anyone" : "No settled farmers"}
              message="Try another filter."
              action={
                <button type="button" onClick={() => onFilter("all")} className="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100">
                  Show all farmers
                </button>
              }
            />
          ) : (
            <EmptyState
              icon="users-three"
              title="No farmers yet"
              message="Add the farmers who buy fertilizer or sell you produce. You can also add one while making a sale or collecting produce."
              action={
                onAdd && (
                  <button type="button" onClick={onAdd} className={primaryButtonClass}>
                    <i className="ph-bold ph-user-plus" /> Add farmer
                  </button>
                )
              }
            />
          )
        ) : (
          <ul className="space-y-1">
            {farmers.map((f) => (
              <li key={f.id}>
                <FarmerRow farmer={f} onOpen={() => setOpenId(f.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {openId && <FarmerDetailDialog shopId={shopId} customerId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** Farmers of the active fertilizer shop: fertilizer credit they owe and produce dues you owe them, in one list. */
export default function FarmersPage() {
  const filterParam = useSearchParams().get("filter");
  const [filter, setFilter] = useState<FarmerFilter>(isFarmerFilter(filterParam) ? filterParam : "all");
  const [seenFilterParam, setSeenFilterParam] = useState(filterParam);
  if (filterParam !== seenFilterParam) {
    setSeenFilterParam(filterParam);
    if (isFarmerFilter(filterParam)) setFilter(filterParam);
  }
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const canManage = useCanManageInventory();

  return (
    <FertilizerShopShell
      pageName="Farmers"
      eyebrow="Farmers"
      actions={
        <>
          <PermissionTooltip allowed={canManage} className="flex">
            <button type="button" onClick={() => setCollecting(true)} disabled={!canManage} className={`${secondaryButtonClass} w-full disabled:opacity-50 disabled:pointer-events-none`}>
              <i className="ph-bold ph-basket" /> Collect Produce
            </button>
          </PermissionTooltip>
          <PermissionTooltip allowed={canManage} className="flex">
            <button type="button" onClick={() => setAdding(true)} disabled={!canManage} className={`${primaryButtonClass} w-full hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none`}>
              <i className="ph-bold ph-user-plus" /> Add Farmer
            </button>
          </PermissionTooltip>
        </>
      }
    >
      {(shopId) => (
        <>
          <FarmersView shopId={shopId} filter={filter} onFilter={setFilter} onAdd={canManage ? () => setAdding(true) : undefined} />
          {adding && canManage && <FarmerFormDialog shopId={shopId} customer={null} onClose={() => setAdding(false)} onSaved={(c) => setOpenId(c.id)} />}
          {openId && <FarmerDetailDialog shopId={shopId} customerId={openId} onClose={() => setOpenId(null)} />}
          {collecting && canManage && <CollectionFormDialog key={`${shopId}-collection`} shopId={shopId} onClose={() => setCollecting(false)} />}
        </>
      )}
    </FertilizerShopShell>
  );
}
