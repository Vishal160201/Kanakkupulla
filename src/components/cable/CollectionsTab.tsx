"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CableProvider, CableSubscriberListResponse, CableSubscriberRow } from "@/types/cable";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState, ErrorState, ListSkeleton, cardClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatDate, formatINR, todayISO } from "@/components/inventory/inventoryUtils";
import { cn } from "@/lib/utils";
import { useCollections } from "./useCableData";
import WhatsAppDialog from "./WhatsAppDialog";

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Opens a plain, printable round sheet (area by area) in a new window and starts printing it. */
function printRound(shopName: string, groups: [string, CableSubscriberRow[]][]) {
  const rows = groups
    .map(
      ([area, subs]) =>
        `<h2>${escapeHtml(area)} <small>${subs.length} · ${escapeHtml(formatINR(subs.reduce((s, x) => s + x.due, 0), { decimals: false }))}</small></h2>
        <table><thead><tr><th>Name</th><th>User ID</th><th>Phone</th><th>Expiry</th><th class="r">Due</th><th>Collected</th></tr></thead><tbody>
        ${subs
          .map(
            (s) =>
              `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.externalId)}</td><td>${escapeHtml(s.phone ?? "")}</td><td>${escapeHtml(formatDate(s.expiresAt))}</td><td class="r">${escapeHtml(formatINR(s.due, { decimals: false }))}</td><td class="blank"></td></tr>`
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

function DueRow({ s, onOpen, onChat }: { s: CableSubscriberRow; onOpen: () => void; onChat: () => void }) {
  return (
    <li className="flex items-center gap-2 rounded-2xl p-2.5 hover:bg-slate-50">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-xl">
        <div className="text-sm font-bold text-slate-900 truncate">{s.name}</div>
        <div className="text-[11px] font-semibold text-slate-400 truncate">{[s.provider === "TCCL" ? "Cable" : "Internet", s.externalId, s.phone, s.plan ?? (s.vcNumber && `VC ${s.vcNumber}`)].filter(Boolean).join(" · ")}</div>
      </button>
      <div className="text-sm font-extrabold text-rose-600 whitespace-nowrap">{formatINR(s.due, { decimals: false })}</div>
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
          <p className="text-xs font-semibold text-slate-400">Payments recorded for the day, and who collected them</p>
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
            {data.byCollector.map((c) => (
              <span key={c.name} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                <i className="ph-bold ph-user mr-1 text-slate-400" aria-hidden="true" />
                {c.name} · {formatINR(c.amount)}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {data.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{p.subscriber.name}</div>
                  <div className="text-[11px] font-semibold text-slate-400 truncate">
                    {[p.subscriber.externalId, p.subscriber.area, p.paymentMode, `by ${p.collectedBy}`].filter(Boolean).join(" · ")}
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

/** The collection round: who owes what, area by area (printable), and what was collected each day. */
export default function CollectionsTab({ shopId, provider, data, onOpen }: { shopId: string; provider: CableProvider; data: CableSubscriberListResponse; onOpen: (id: string) => void }) {
  const [chat, setChat] = useState<CableSubscriberRow | null>(null);
  const owing = data.subscribers.filter((s) => s.due > 0 && !s.goneAt && (s.provider === "TCCL") === (provider === "TCCL"));
  const byArea = new Map<string, CableSubscriberRow[]>();
  for (const s of owing) byArea.set(s.area ?? "No area", [...(byArea.get(s.area ?? "No area") ?? []), s]);
  const groups = [...byArea]
    .map(([area, subs]) => [area, subs.sort((a, b) => b.due - a.due)] as [string, CableSubscriberRow[]])
    .sort((a, b) => a[0].localeCompare(b[0]));
  const total = owing.reduce((sum, s) => sum + s.due, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className={cn(cardClass, "p-4 sm:p-5 space-y-4")}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-base font-extrabold text-slate-900">To collect</h2>
            <p className="text-xs font-semibold text-slate-400">
              {owing.length} subscriber{owing.length === 1 ? "" : "s"} · {formatINR(total, { decimals: false })}, by area for the line staff&apos;s round
            </p>
          </div>
          <button type="button" onClick={() => printRound(data.shop.name, groups)} disabled={owing.length === 0} className={secondaryButtonClass}>
            <i className="ph-bold ph-printer" aria-hidden="true" /> Print round sheet
          </button>
        </div>
        {owing.length === 0 ? (
          <EmptyState icon="check-circle" title="Nothing to collect" message="Renewals show up here once their plan has a price (Settings → Plan prices)." />
        ) : (
          <div className="space-y-4">
            {groups.map(([area, subs]) => (
              <div key={area}>
                <div className="flex items-center justify-between px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">
                  <span>{area}</span>
                  <span>
                    {subs.length} · {formatINR(subs.reduce((s, x) => s + x.due, 0), { decimals: false })}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {subs.map((s) => (
                    <DueRow key={s.id} s={s} onOpen={() => onOpen(s.id)} onChat={() => setChat(s)} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <DayCollections shopId={shopId} provider={provider} />

      {chat && <WhatsAppDialog target={{ provider: chat.provider, vcNumber: chat.vcNumber, name: chat.name, phone: chat.phone, plan: chat.plan, expiresAt: chat.expiresAt, due: chat.due }} shop={data.shop} onClose={() => setChat(null)} />}
    </div>
  );
}
