"use client";

import { useState } from "react";
import type { CableSubscriberRow } from "@/types/cable";
import { EmptyState, ErrorState, InventoryDialog, ListSkeleton, SearchInput, cardClass, primaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, useDebouncedValue } from "@/components/inventory/inventoryUtils";
import { cn } from "@/lib/utils";
import { useCanManageCable, useComplaints } from "./useCableData";
import ComplaintForm, { ComplaintRow } from "./ComplaintForm";

/** Pick the subscriber, then fill in the complaint. */
function NewComplaintDialog({ subscribers, onClose }: { subscribers: CableSubscriberRow[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<CableSubscriberRow | null>(null);
  const term = useDebouncedValue(search, 150).trim().toLowerCase();
  const matches = term
    ? subscribers.filter((s) => !s.goneAt && [s.name, s.externalId, s.phone, s.area].some((v) => v?.toLowerCase().includes(term))).slice(0, 8)
    : [];
  return (
    <InventoryDialog open onClose={onClose} eyebrow="Complaints" title={picked ? picked.name : "Log complaint"} subtitle={picked ? [picked.externalId, picked.area].filter(Boolean).join(" · ") : "Find the subscriber first"}>
      {picked ? (
        <ComplaintForm subscriberId={picked.id} onDone={onClose} />
      ) : (
        <div className="space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, user ID, phone or area" autoFocus />
          {term && matches.length === 0 && <p className="text-sm font-medium text-slate-400">No subscriber matches &quot;{search.trim()}&quot;.</p>}
          <ul className="space-y-1">
            {matches.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setPicked(s)} className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                  <div className="text-sm font-bold text-slate-900">{s.name}</div>
                  <div className="text-[11px] font-semibold text-slate-400">{[s.externalId, s.phone, s.area].filter(Boolean).join(" · ")}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </InventoryDialog>
  );
}

/** Open complaints (oldest first) with who's fixing them; fixed ones for reference. */
export default function ComplaintsTab({ shopId, subscribers, onOpen }: { shopId: string; subscribers: CableSubscriberRow[]; onOpen: (id: string) => void }) {
  const [status, setStatus] = useState<"open" | "fixed">("open");
  const [adding, setAdding] = useState(false);
  const canManage = useCanManageCable();
  const { data, error, isLoading, mutate } = useComplaints(shopId, status);

  return (
    <section className={cn(cardClass, "p-4 sm:p-5 space-y-4")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="grid grid-cols-2 sm:flex bg-slate-50 border border-slate-200 rounded-xl p-1" role="radiogroup" aria-label="Complaint status">
          {(["open", "fixed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold", status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
            >
              {s === "open" ? "Open" : "Fixed"}
            </button>
          ))}
        </div>
        {canManage && (
          <button type="button" onClick={() => setAdding(true)} className={cn(primaryButtonClass, "sm:ml-auto")}>
            <i className="ph-bold ph-plus" aria-hidden="true" /> Log complaint
          </button>
        )}
      </div>
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <ListSkeleton rows={3} />
      ) : data.complaints.length === 0 ? (
        <EmptyState icon={status === "open" ? "check-circle" : "wrench"} title={status === "open" ? "No open complaints" : "No fixed complaints yet"} />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {data.complaints.map((c) => (
            <ComplaintRow
              key={`${c.id}-${c.assignedToId}-${c.fixedAt}`}
              complaint={c}
              canManage={canManage}
              people={data.people}
              subscriber={
                <button type="button" onClick={() => onOpen(c.subscriber.id)} className="text-xs font-extrabold text-sky-700 hover:underline">
                  {c.subscriber.name}
                  <span className="font-semibold text-slate-400"> · {[c.subscriber.phone, c.subscriber.area].filter(Boolean).join(" · ")}</span>
                </button>
              }
            />
          ))}
        </ul>
      )}
      {adding && <NewComplaintDialog subscribers={subscribers} onClose={() => setAdding(false)} />}
    </section>
  );
}
