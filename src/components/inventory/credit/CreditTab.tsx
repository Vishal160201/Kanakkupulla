"use client";

import { useMemo, useState } from "react";
import { EmptyState, ErrorState, ListSkeleton, Pill, SearchInput, cardClass, primaryButtonClass } from "../InventoryUI";
import { errorMessage, formatDate, formatINR, useCanManageInventory, useDebouncedValue } from "../inventoryUtils";
import { useCreditCustomers } from "../useInventoryData";
import CustomerFormDialog from "./CustomerFormDialog";
import CustomerDetailDialog from "./CustomerDetailDialog";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** Farmers buying on credit, highest balance first. */
export default function CreditTab({ shopId }: { shopId: string }) {
  const [search, setSearch] = useState("");
  const [onlyDues, setOnlyDues] = useState(true);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const canManage = useCanManageInventory();
  const debouncedSearch = useDebouncedValue(search);
  const { data, error, isLoading, isValidating, mutate } = useCreditCustomers(shopId, debouncedSearch);

  const all = useMemo(() => data?.customers ?? [], [data]);
  const customers = useMemo(
    () =>
      all
        .filter((c) => !c.isArchived)
        .filter((c) => !onlyDues || c.balance > 0)
        .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name)),
    [all, onlyDues]
  );
  const totalDue = customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);

  return (
    <div className={cn(cardClass, "p-4 sm:p-5")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or village" />
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-11" role="radiogroup" aria-label="Customer filter">
            {[true, false].map((dues) => (
              <button
                key={String(dues)}
                type="button"
                role="radio"
                aria-checked={onlyDues === dues}
                onClick={() => setOnlyDues(dues)}
                className={cn("px-3 rounded-lg text-xs sm:text-sm font-bold transition-all", onlyDues === dues ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                {dues ? "With dues" : "All"}
              </button>
            ))}
          </div>
          {canManage && (
            <button type="button" onClick={() => setAdding(true)} className={cn(primaryButtonClass, "flex-1 sm:flex-none")}>
              <i className="ph-bold ph-user-plus" /> Add customer
            </button>
          )}
        </div>
      </div>

      {data && customers.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-rose-50/60 border border-rose-100 px-4 py-2.5">
          <span className="text-xs font-bold text-rose-700">
            {onlyDues ? `${customers.length} customer${customers.length === 1 ? "" : "s"} with dues` : `${customers.length} customer${customers.length === 1 ? "" : "s"}`}
            {isValidating && <i className="ph ph-circle-notch animate-spin ml-2" aria-hidden="true" />}
          </span>
          <span className="text-sm font-extrabold text-rose-700">{formatINR(totalDue)}</span>
        </div>
      )}

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <ListSkeleton />
      ) : customers.length === 0 ? (
        debouncedSearch ? (
          <EmptyState icon="magnifying-glass" title="No matching customers" message={`Nothing matches "${debouncedSearch}".`} />
        ) : onlyDues && all.length > 0 ? (
          <EmptyState
            icon="check-circle"
            title="No pending dues"
            message="Every customer has paid up."
            action={
              <button type="button" onClick={() => setOnlyDues(false)} className="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100">
                Show all customers
              </button>
            }
          />
        ) : (
          <EmptyState
            icon="users-three"
            title="No credit customers yet"
            message="Add farmers who buy on credit. You can also add one while making a sale."
            action={
              canManage && (
                <button type="button" onClick={() => setAdding(true)} className={primaryButtonClass}>
                  <i className="ph-bold ph-user-plus" /> Add customer
                </button>
              )
            }
          />
        )
      ) : (
        <ul className="space-y-1">
          {customers.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpenId(c.id)}
                className="w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-extrabold", c.balance > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500")}>
                    {initials(c.name) || <i className="ph-bold ph-user" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{c.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {[c.place, c.phone].filter(Boolean).join(" · ") || "No contact details"}
                      {c.lastActivity && <span className="hidden sm:inline"> &middot; Last activity {formatDate(c.lastActivity)}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {c.balance > 0 ? (
                    <>
                      <div className="text-sm font-extrabold text-rose-600">{formatINR(c.balance)}</div>
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

      {adding && canManage && <CustomerFormDialog shopId={shopId} customer={null} onClose={() => setAdding(false)} onSaved={(c) => setOpenId(c.id)} />}
      {openId && <CustomerDetailDialog shopId={shopId} customerId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
