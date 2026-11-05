"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CableProvider, CableSubscriberListResponse, CableSubscriberRow } from "@/types/cable";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { Tooltip } from "@/components/ui/Tooltip";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { EmptyState, ErrorState, InventoryDialog, KpiCard, ListSkeleton, SearchInput, cardClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatDate, formatINR, roundMoney, sendJson, todayISO, useDebouncedValue } from "@/components/inventory/inventoryUtils";
import { cn } from "@/lib/utils";
import { useCanManageCable, useCollections, useRevalidateCable } from "./useCableData";
import WhatsAppDialog from "./WhatsAppDialog";
import CollectPaymentForm from "./CollectPaymentForm";
import { TCCL_PAY_DAY, monthLabel } from "@/lib/cableMonthly";

const ALL_GROUPS = "All groups";
const NO_GROUP = "No group";

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Opens a plain, printable round sheet (area by area) in a new window and starts printing it. */
function printRound(shopName: string, groups: [string, CableSubscriberRow[]][], isCable: boolean) {
  const rows = groups
    .map(
      ([area, subs]) =>
        `<h2>${escapeHtml(area)} <small>${subs.length} · ${escapeHtml(formatINR(subs.reduce((s, x) => s + x.due, 0), { decimals: false }))}</small></h2>
        <table><thead><tr><th>Name</th><th>User ID</th><th>Phone</th><th>${isCable ? "VC number" : "Expiry"}</th><th class="r">Due</th><th>Collected</th></tr></thead><tbody>
        ${subs
          .map(
            (s) =>
              `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.externalId)}</td><td>${escapeHtml(s.phone ?? "")}</td><td>${escapeHtml(isCable ? (s.oldVcNumber ?? s.vcNumber ?? "") : formatDate(s.expiresAt))}</td><td class="r">${escapeHtml(formatINR(s.due, { decimals: false }))}</td><td class="blank"></td></tr>`
          )
          .join("")}
        </tbody></table>`
    )
    .join("");
  const win = window.open("", "_blank");
  if (!win) return toast.error("Allow pop-ups for this site to print the round sheet.");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Collection round · ${escapeHtml(shopName)}</title>
    <style>body{font:12px system-ui,sans-serif;color:#0f172a;margin:24px}h1{font-size:16px;margin:0 0 4px}p{margin:0 0 16px;color:#64748b}
    h2{font-size:13px;margin:18px 0 6px}h2 small{font-weight:600;color:#64748b}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #cbd5e1;padding:5px 6px;text-align:left}th{background:#f1f5f9}.r{text-align:right}.blank{width:90px}</style></head>
    <body><h1>Collection round · ${escapeHtml(shopName)}</h1><p>Printed ${escapeHtml(formatDate(new Date().toISOString()))}</p>${rows}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function DueRow({ s, canManage, paying, onPay, onOther, onOpen, onChat }: { s: CableSubscriberRow; canManage: boolean; paying: boolean; onPay: () => void; onOther: () => void; onOpen: () => void; onChat: () => void }) {
  const isCable = s.provider === "TCCL";
  return (
    <li className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-2xl p-2.5 hover:bg-slate-50">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-xl">
        <div className="text-sm font-bold text-slate-900 truncate">
          {s.name}
          {s.tamilName && <span className="ml-1.5 font-semibold text-slate-500">{s.tamilName}</span>}
        </div>
        <div className="text-[11px] font-semibold text-slate-400 truncate">{[isCable ? (s.oldVcNumber ?? s.vcNumber) && `VC ${s.oldVcNumber ?? s.vcNumber}` : s.plan, s.externalId, s.phone].filter(Boolean).join(" · ")}</div>
      </button>
      <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
        {s.phone && (
          <Tooltip content="Call">
            <a href={`tel:${s.phone}`} aria-label={`Call ${s.name}`} className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100">
              <i className="ph-bold ph-phone" aria-hidden="true" />
            </a>
          </Tooltip>
        )}
        <Tooltip content="WhatsApp">
          <button type="button" onClick={onChat} aria-label={`WhatsApp ${s.name}`} className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50">
            <i className="ph-fill ph-whatsapp-logo text-lg" aria-hidden="true" />
          </button>
        </Tooltip>
        {canManage ? (
          <>
            <Tooltip content="Other amount or UPI">
              <button type="button" onClick={onOther} disabled={paying} aria-label={`Other amount from ${s.name}`} className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <i className="ph-bold ph-pencil-simple" aria-hidden="true" />
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={onPay}
              disabled={paying}
              className="ml-1 h-9 min-w-[112px] shrink-0 rounded-xl bg-emerald-600 px-3 text-sm font-extrabold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              <i className={paying ? "ph ph-circle-notch animate-spin" : "ph-bold ph-check"} aria-hidden="true" />
              Paid {formatINR(s.due, { decimals: false })}
            </button>
          </>
        ) : (
          <span className="ml-1 text-sm font-extrabold text-rose-600 whitespace-nowrap">{formatINR(s.due, { decimals: false })}</span>
        )}
      </div>
    </li>
  );
}

function DayCollections({ shopId, provider }: { shopId: string; provider: CableProvider }) {
  const [date, setDate] = useState(todayISO());
  const { data, error, isLoading, mutate } = useCollections(shopId, date, provider);
  return (
    <section className={cn(cardClass, "p-4 sm:p-5 space-y-4")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-slate-900">Collected</h2>
          <p className="text-xs font-semibold text-slate-400">Payments recorded for the day</p>
        </div>
        <div className="sm:w-48">
          <DatePickerInput value={date} onChange={setDate} disableFutureDates />
        </div>
      </div>
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <ListSkeleton rows={2} />
      ) : data.payments.length === 0 ? (
        <EmptyState icon="hand-coins" title="Nothing collected" message={`No payments recorded on ${formatDate(date)}.`} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-extrabold text-emerald-800">Total {formatINR(data.total)}</span>
          </div>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {data.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{p.subscriber.name}</div>
                  <div className="text-[11px] font-semibold text-slate-400 truncate">
                    {[p.subscriber.externalId, p.paymentMode].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="text-sm font-extrabold text-emerald-700 whitespace-nowrap">{formatINR(p.amount)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** The collection round: who owes what, group by group, paid with one tap (printable), and what came in each day. */
export default function CollectionsTab({ shopId, provider, data, onOpen }: { shopId: string; provider: CableProvider; data: CableSubscriberListResponse; onOpen: (id: string) => void }) {
  const isCable = provider === "TCCL";
  const canManage = useCanManageCable();
  const revalidate = useRevalidateCable();
  const [chat, setChat] = useState<CableSubscriberRow | null>(null);
  const [other, setOther] = useState<CableSubscriberRow | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [group, setGroup] = useState(ALL_GROUPS);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search).trim().toLowerCase();

  const owing = data.subscribers.filter((s) => s.due > 0 && !s.goneAt && (s.provider === "TCCL") === isCable);
  const groupNames = [...new Set(owing.map((s) => s.groupName ?? NO_GROUP))].sort((a, b) => (a === NO_GROUP ? 1 : b === NO_GROUP ? -1 : a.localeCompare(b, undefined, { numeric: true })));
  const shownGroup = groupNames.includes(group) ? group : ALL_GROUPS;
  const list = owing.filter(
    (s) =>
      (shownGroup === ALL_GROUPS || (s.groupName ?? NO_GROUP) === shownGroup) &&
      (!q || [s.name, s.tamilName, s.externalId, s.phone, s.vcNumber, s.oldVcNumber].some((v) => v?.toLowerCase().includes(q)))
  );
  const byGroup = new Map<string, CableSubscriberRow[]>();
  for (const s of list) byGroup.set(s.groupName ?? NO_GROUP, [...(byGroup.get(s.groupName ?? NO_GROUP) ?? []), s]);
  // Register order: group by group, names A to Z
  const groups = groupNames.filter((g) => byGroup.has(g)).map((g) => [g, byGroup.get(g)!.sort((a, b) => a.name.localeCompare(b.name))] as [string, CableSubscriberRow[]]);
  const total = list.reduce((sum, s) => sum + s.due, 0);

  const undo = async (paymentId: string, name: string) => {
    try {
      await sendJson(`/api/cable/payments/${encodeURIComponent(paymentId)}/void`, "POST");
      toast.success(`Payment from ${name} undone`);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const pay = async (s: CableSubscriberRow) => {
    setPaying(s.id);
    try {
      const amount = roundMoney(s.due);
      const r = await sendJson<{ id: string }>(`/api/cable/subscribers/${encodeURIComponent(s.id)}/payments`, "POST", { amount, date: todayISO(), paymentMode: "Cash" });
      toast.success(`${formatINR(amount)} from ${s.name}`, { description: "Cash, posted to Daily Kanakku.", action: { label: "Undo", onClick: () => void undo(r.id, s.name) } });
      await revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPaying(null);
    }
  };

  const { billed, collected, month } = data.tcclMonth;
  const payBy = `${TCCL_PAY_DAY} ${monthLabel(month).split(" ")[0]}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      {isCable && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <KpiCard label={`Collected · ${monthLabel(month)}`} value={formatINR(collected, { decimals: false })} hint="From houses this month" icon="hand-coins" iconClass="bg-emerald-50 text-emerald-600" />
          <KpiCard label="To pay TCCL" value={formatINR(billed, { decimals: false })} hint={`TCCL's bills this month · by ${payBy}`} icon="television-simple" iconClass="bg-sky-50 text-sky-600" />
          <KpiCard label="Left after TCCL" value={formatINR(collected - billed, { decimals: false })} hint="Collected minus TCCL's bills" icon="wallet" iconClass="bg-violet-50 text-violet-600" highlight={collected - billed < 0} />
        </div>
      )}
      <section className={cn(cardClass, "p-4 sm:p-5 space-y-4")}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-base font-extrabold text-slate-900">To collect</h2>
            <p className="text-xs font-semibold text-slate-400">
              {list.length} house{list.length === 1 ? "" : "s"} · {formatINR(total, { decimals: false })}
              {shownGroup !== ALL_GROUPS && ` in ${shownGroup}`}
            </p>
          </div>
          <button type="button" onClick={() => printRound(data.shop.name, groups, isCable)} disabled={list.length === 0} className={secondaryButtonClass}>
            <i className="ph-bold ph-printer" aria-hidden="true" /> Print round sheet
          </button>
        </div>
        {owing.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder={isCable ? "Search name, Tamil name, VC or phone" : "Search name, ID or phone"} />
            {groupNames.length > 1 && (
              <div className="w-full sm:w-48 shrink-0">
                <CustomDropdown options={[ALL_GROUPS, ...groupNames]} value={shownGroup} onChange={setGroup} />
              </div>
            )}
          </div>
        )}
        {owing.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title="Nothing to collect"
            message={isCable ? (data.shop.cableMonthlyFee === null ? "Set the monthly amount in Settings and houses are charged on the 1st of each month." : "Everyone has paid. Next month's amounts are added on the 1st.") : "Renewals show up here once their plan has a price (Settings → Plan prices)."}
          />
        ) : list.length === 0 ? (
          <EmptyState icon="magnifying-glass" title="No matching houses" message={`Nothing matches "${search.trim()}".`} />
        ) : (
          <div className="space-y-4">
            {groups.map(([name, subs]) => (
              <div key={name}>
                <div className="flex items-center justify-between px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">
                  <span>{name}</span>
                  <span>
                    {subs.length} · {formatINR(subs.reduce((s, x) => s + x.due, 0), { decimals: false })}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {subs.map((s) => (
                    <DueRow key={s.id} s={s} canManage={canManage} paying={paying === s.id} onPay={() => void pay(s)} onOther={() => setOther(s)} onOpen={() => onOpen(s.id)} onChat={() => setChat(s)} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <DayCollections shopId={shopId} provider={provider} />

      {other && (
        <InventoryDialog open onClose={() => setOther(null)} size="md" eyebrow="Collect" title={other.name} subtitle={`Owes ${formatINR(other.due)}`}>
          <CollectPaymentForm subscriberId={other.id} due={other.due} isCable={isCable} onDone={() => setOther(null)} />
        </InventoryDialog>
      )}
      {chat && <WhatsAppDialog key={chat.id} target={{ id: chat.id, provider: chat.provider, vcNumber: chat.vcNumber, name: chat.name, phone: chat.phone, plan: chat.plan, expiresAt: chat.expiresAt, due: chat.due }} shop={data.shop} onClose={() => setChat(null)} />}
    </div>
  );
}
