"use client";

import type { CableProvider, CableSubscriberListResponse, CableSubscriberRow } from "@/types/cable";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, EmptyState, KpiCard, Pagination, Pill, SearchInput, cardClass, primaryButtonClass, type PillTone } from "@/components/inventory/InventoryUI";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { errorMessage, sendJson } from "@/components/inventory/inventoryUtils";
import { useCanManageCable } from "./useCableData";
import { formatDate, formatINR, useDebouncedValue } from "@/components/inventory/inventoryUtils";
import { initials } from "@/components/inventory/produce/produceShared";
import { cn } from "@/lib/utils";
import { SOON_DAYS, expiryLabel, expiryState, type ExpiryState } from "./cableShared";
import { exportSubscribers, type ExportFormat } from "./subscriberFiles";
import ImportSubscribersDialog from "./ImportSubscribersDialog";
import { tempVc } from "@/lib/cableImport";

const ALL_GROUPS = "All groups";
const NO_GROUP = "No group";

const FILE_ACTIONS:{ id: ExportFormat | "import"; label: string; icon: string }[] = [
  { id: "import", label: "Import xlsx / csv", icon: "ph-upload-simple text-orange-500" },
  { id: "xlsx", label: "Export as Excel", icon: "ph-microsoft-excel-logo text-emerald-600" },
  { id: "csv", label: "Export as CSV", icon: "ph-file-csv text-emerald-500" },
  { id: "pdf", label: "Export as PDF", icon: "ph-file-pdf text-rose-500" },
];

/** One button for getting subscribers in and out as files. Exports the list as filtered and searched. */
function FileMenu({ list, isCable, onImport }: { list: CableSubscriberRow[]; isCable: boolean; onImport: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (id: ExportFormat | "import") => {
    setOpen(false);
    if (id === "import") return onImport();
    if (list.length === 0) return toast.error("No subscribers to export.");
    setBusy(true);
    try {
      await exportSubscribers(list, id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-[45px] w-full lg:w-auto px-4 rounded-xl border border-slate-200 bg-white shadow-sm font-bold text-sm text-slate-700 flex items-center justify-center gap-2 transition-all hover:shadow-md hover:border-slate-300"
      >
        <i className={busy ? "ph ph-circle-notch animate-spin" : "ph-bold ph-swap"} aria-hidden="true" /> Import / Export
        <i className="ph-bold ph-caret-down text-xs text-slate-400" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
            {FILE_ACTIONS.filter((a) => isCable || a.id !== "import").map((a) => (
              <button key={a.id} type="button" role="menuitem" onClick={() => void run(a.id)} className="w-full text-left px-4 py-2.5 text-[0.85rem] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                <i className={`ph-bold ${a.icon} text-lg`} aria-hidden="true" /> {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Filter = "all" | "soon" | "expired" | "active" | "inactive" | "dues" | "gone";

const INTERNET_FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "soon", label: "Expiring" },
  { id: "expired", label: "Expired" },
  { id: "dues", label: "Dues" },
  { id: "gone", label: "Removed" },
];
// Active first (the default view), All last
const CABLE_FILTERS: { id: Filter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Box off" },
  { id: "dues", label: "Dues" },
  { id: "gone", label: "Removed" },
  { id: "all", label: "All" },
];

const STATE_TONE: Record<ExpiryState, string> = {
  gone: "text-slate-400",
  expired: "text-rose-600",
  soon: "text-amber-700",
  ok: "text-emerald-700",
  unknown: "text-slate-400",
};

const statusTone = (status: string): PillTone => (status === "Active" ? "green" : status === "Inactive" ? "slate" : "amber");

function matches(s: CableSubscriberRow, filter: Filter, now: number) {
  const state = expiryState(s, now);
  if (filter === "gone") return state === "gone";
  if (filter === "dues") return s.due > 0;
  if (state === "gone") return false;
  if (filter === "all") return true;
  if (filter === "active") return s.status === "Active";
  if (filter === "inactive") return s.status !== "Active";
  return state === filter; // soon | expired (internet)
}

/** Plans still running first, soonest to expire on top; then expired ones, most recent first. */
function byUrgency(now: number) {
  const time = (s: CableSubscriberRow) => (s.expiresAt ? new Date(s.expiresAt).getTime() : Infinity);
  return (a: CableSubscriberRow, b: CableSubscriberRow) => {
    const aPast = time(a) < now;
    const bPast = time(b) < now;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return (aPast ? time(b) - time(a) : time(a) - time(b)) || a.name.localeCompare(b.name);
  };
}

function SubscriberRow({ s, isCable, now, onOpen }: { s: CableSubscriberRow; isCable: boolean; now: number; onOpen: () => void }) {
  const state = expiryState(s, now);
  const details = [s.groupName, s.externalId, s.phone, s.area].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
    >
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-extrabold", isCable ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700")}>
        {initials(s.name) || <i className="ph-bold ph-user" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm text-slate-900 truncate">
            {s.name}
            {s.tamilName && <span className="font-semibold text-slate-500"> ({s.tamilName})</span>}
          </span>
          <Pill tone={state === "gone" ? "slate" : statusTone(s.status)}>{state === "gone" ? "Removed" : s.status}</Pill>
          {s.openComplaints > 0 && <Pill tone="amber" icon="wrench">{s.openComplaints}</Pill>}
        </div>
        <div className="text-[11px] font-semibold text-slate-400 truncate">{details}</div>
      </div>
      <div className="hidden lg:block w-[200px] shrink-0 text-xs font-semibold text-slate-500 truncate" title={s.plan ?? undefined}>
        {/* The customer's own box (stable); a temp box lent while it's repaired is TCCL's current VC */}
        {isCable ? ((s.oldVcNumber ?? s.vcNumber) ? `VC ${s.oldVcNumber ?? s.vcNumber}` : "—") : (s.plan ?? "—")}
        {isCable && tempVc(s) && <div className="text-[10px] font-bold text-amber-700">Temp VC {tempVc(s)}</div>}
      </div>
      <div className="hidden sm:block text-right shrink-0 w-[150px]">
        {isCable ? (
          <>
            <div className="text-sm font-extrabold text-slate-800 whitespace-nowrap">Cable TV</div>
            <div className={cn("text-[11px] font-bold whitespace-nowrap", state === "gone" ? "text-slate-400" : s.status === "Active" ? "text-emerald-700" : "text-rose-600")}>
              {state === "gone" ? "Not in TCCL" : s.status === "Active" ? "Box active" : "Box deactivated"}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-extrabold text-slate-800 whitespace-nowrap">{formatDate(s.expiresAt)}</div>
            <div className={cn("text-[11px] font-bold whitespace-nowrap truncate", STATE_TONE[state])}>{state === "gone" ? "Not in TIC Fiber" : expiryLabel(s.expiresAt, now)}</div>
          </>
        )}
      </div>
      <div className="text-right shrink-0 w-[96px]">
        {s.due > 0 ? (
          <div className="text-sm font-extrabold text-rose-600 whitespace-nowrap">{formatINR(s.due, { decimals: false })}</div>
        ) : s.due < 0 ? (
          <div className="text-xs font-bold text-emerald-700 whitespace-nowrap">{formatINR(-s.due, { decimals: false })} adv.</div>
        ) : (
          <div className="text-sm font-bold text-slate-300">—</div>
        )}
        <div className={cn("sm:hidden text-[10px] font-bold whitespace-nowrap truncate", STATE_TONE[state])}>
          {state === "gone" ? "Removed" : isCable ? (s.status === "Active" ? "Cable" : "Box off") : expiryLabel(s.expiresAt, now).replace("Expires", "").trim()}
        </div>
      </div>
    </button>
  );
}

/** Subscribers of one provider, with the filters and columns that fit internet or cable. */
export default function SubscribersTab({ shopId, data, provider, now, onOpen }: { shopId: string; data: CableSubscriberListResponse; provider: CableProvider; now: number; onOpen: (id: string) => void }) {
  const isCable = provider === "TCCL";
  const FILTERS = isCable ? CABLE_FILTERS : INTERNET_FILTERS;
  const [filter, setFilter] = useState<Filter>(FILTERS[0].id);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search).trim().toLowerCase();

  // A shop has tens to a few thousand subscribers: cheap enough to filter on every render
  const all = data.subscribers.filter((s) => (s.provider === "TCCL") === isCable);
  const groups = [...new Set(all.map((s) => s.groupName).filter((g): g is string => !!g))].sort();
  const [group, setGroup] = useState(ALL_GROUPS);
  const inGroup = group === ALL_GROUPS ? all : all.filter((s) => (group === NO_GROUP ? !s.groupName : s.groupName === group));
  const searched = debounced
    ? inGroup.filter((s) => [s.name, s.tamilName, s.groupName, s.externalId, s.phone, s.altPhone, s.area, s.address, s.plan, s.vcNumber, s.oldVcNumber, s.macId, s.status].some((v) => v?.toLowerCase().includes(debounced)))
    : inGroup;
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, searched.filter((s) => matches(s, f.id, now)).length])) as Record<Filter, number>;
  const list = searched.filter((s) => matches(s, filter, now)).sort(filter === "dues" ? (a, b) => b.due - a.due : byUrgency(now));
  const totalDue = all.reduce((sum, s) => sum + Math.max(0, s.due), 0);

  // Pagination (client-side); back to page 1 whenever the filter, search or page size changes
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const pageKey = `${filter}|${group}|${debounced}|${pageSize}`;
  const [lastPageKey, setLastPageKey] = useState(pageKey);
  if (pageKey !== lastPageKey) {
    setLastPageKey(pageKey);
    setPage(1);
  }
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = list.slice((safePage - 1) * pageSize, safePage * pageSize);

  const canManage = useCanManageCable();
  const [importing, setImporting] = useState(false);
  const [confirmSms, setConfirmSms] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  // Who an SMS reminder would go to: owing, or (internet only) expiring soon / expired
  const reminderTargets = all.filter((s) => !s.goneAt && s.phone && (s.due > 0 || (!isCable && ["soon", "expired"].includes(expiryState(s, now))))).length;
  const sendReminders = async () => {
    setSendingSms(true);
    try {
      const r = await sendJson<{ queued: number }>("/api/cable/sms/reminders", "POST", { shopId, provider });
      toast.success(`${r.queued} SMS queued`, { description: "Your phone will send them over the next few minutes." });
      setConfirmSms(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {canManage && data.shop.smsConfigured && reminderTargets > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
          <p className="text-sm font-semibold text-slate-600 min-w-0">
            <i className="ph-bold ph-chat-text text-sky-600 mr-1.5" aria-hidden="true" />
            {reminderTargets} subscriber{reminderTargets === 1 ? "" : "s"} can get an SMS reminder (expiring, expired or owing).
          </p>
          <button type="button" onClick={() => setConfirmSms(true)} className={cn(primaryButtonClass, "shrink-0 bg-sky-600 hover:bg-sky-700 shadow-sky-600/20")}>
            <i className="ph-bold ph-paper-plane-tilt" aria-hidden="true" /> Send reminders
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Subscribers" value={String(all.length)} hint={isCable ? "In TCCL" : "In TIC Fiber"} icon={isCable ? "television-simple" : "wifi-high"} iconClass="bg-sky-50 text-sky-600" onClick={() => setFilter("all")} />
        {isCable ? (
          <>
            <KpiCard label="Active boxes" value={String(counts.active)} hint="Set-top box on" icon="check-circle" iconClass="bg-emerald-50 text-emerald-600" onClick={() => setFilter("active")} />
            <KpiCard label="Box off" value={String(counts.inactive)} hint="Deactivated in TCCL" icon="television-simple" iconClass="bg-rose-50 text-rose-500" onClick={() => setFilter("inactive")} />
          </>
        ) : (
          <>
            <KpiCard label="Expiring" value={String(counts.soon)} hint={`Within ${SOON_DAYS} days`} icon="hourglass-medium" iconClass="bg-amber-50 text-amber-600" onClick={() => setFilter("soon")} />
            <KpiCard label="Expired" value={String(counts.expired)} hint="Need a renewal" icon="calendar-x" iconClass="bg-rose-50 text-rose-500" onClick={() => setFilter("expired")} />
          </>
        )}
        <KpiCard label="Dues" value={formatINR(totalDue, { decimals: false })} hint={`${counts.dues} to collect`} icon="hand-coins" iconClass="bg-violet-50 text-violet-600" highlight={totalDue > 0} onClick={() => setFilter("dues")} />
      </div>

      <div className={cn(cardClass, "p-4 sm:p-5")}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder={isCable ? "Search name, Tamil name, ID, phone, VC or old VC" : "Search name, ID, phone, area or plan"} />
          {groups.length > 0 && (
            <div className="w-full lg:w-44 shrink-0">
              <CustomDropdown options={[ALL_GROUPS, ...groups, NO_GROUP]} value={group} onChange={setGroup} />
            </div>
          )}
          <div className="w-full lg:w-44 lg:ml-auto shrink-0">
            <CustomDropdown options={FILTERS.map((f) => ({ value: f.id, label: `${f.label} (${counts[f.id]})` }))} value={filter} onChange={(v) => setFilter(v as Filter)} />
          </div>
          <FileMenu list={list} isCable={isCable} onImport={() => setImporting(true)} />
        </div>

        {list.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">
            <span className="flex-1">Subscriber</span>
            <span className="hidden lg:block w-[200px]">{isCable ? "VC number" : "Plan"}</span>
            <span className="w-[150px] text-right">{isCable ? "Box" : "Expiry"}</span>
            <span className="w-[96px] text-right">Due</span>
          </div>
        )}

        {list.length === 0 ? (
          debounced ? (
            <EmptyState icon="magnifying-glass" title="No matching subscribers" message={`Nothing matches "${search.trim()}".`} />
          ) : all.length === 0 ? (
            <EmptyState icon={isCable ? "television-simple" : "broadcast"} title="No subscribers yet" message={`They appear here after the first sync from ${isCable ? "TCCL" : "TIC Fiber"}.`} />
          ) : (
            <EmptyState
              icon="check-circle"
              title="No subscribers here"
              message="Try another filter."
              action={
                <button type="button" onClick={() => setFilter("all")} className="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100">
                  Show all subscribers
                </button>
              }
            />
          )
        ) : (
          <>
            <ul className="space-y-1">
              {paged.map((s) => (
                <li key={s.id}>
                  <SubscriberRow s={s} isCable={isCable} now={now} onOpen={() => onOpen(s.id)} />
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-[0.8rem] font-bold text-slate-500">
                <span>Per page</span>
                <div className="w-24">
                  <CustomDropdown options={["25", "50", "100"]} value={String(pageSize)} onChange={(v) => setPageSize(Number(v))} />
                </div>
              </div>
              <div className="sm:ml-auto">
                <Pagination page={safePage} pageSize={pageSize} total={list.length} onPageChange={setPage} />
              </div>
            </div>
          </>
        )}
      </div>

      {importing && <ImportSubscribersDialog shopId={shopId} canSave={canManage} onClose={() => setImporting(false)} />}
      <ConfirmDialog
        open={confirmSms}
        title="Send SMS reminders?"
        message={`An SMS goes to ${reminderTargets} ${isCable ? "cable" : "internet"} subscriber${reminderTargets === 1 ? "" : "s"} (expiring, expired or owing), from your phone's SIM via httpSMS.`}
        confirmLabel="Send"
        busyLabel="Sending…"
        icon="chat-text"
        tone="neutral"
        busy={sendingSms}
        onConfirm={() => void sendReminders()}
        onCancel={() => setConfirmSms(false)}
      />
    </div>
  );
}
