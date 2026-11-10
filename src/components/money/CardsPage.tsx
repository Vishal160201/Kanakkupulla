"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatINR, formatMoneyDate, maskLast4 } from "@/lib/money/format";
import type { cardsView } from "@/lib/money/server/overview";
import ManualTxnDialog from "./ManualTxnDialog";
import { Amount, EmptyState, Panel, primaryButton, secondaryButton } from "./ui";

export type CardsData = Awaited<ReturnType<typeof cardsView>>;

export default function CardsPage({ initial }: { initial: CardsData }) {
  const { data = initial, mutate } = useSWR<CardsData>("/api/money/cards", fetcher, { fallbackData: initial });
  const [adding, setAdding] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <EmptyState
        icon="ph-credit-card"
        title="No credit cards yet"
        text="Add your HDFC and Kiwi cards in Settings, with their billing cycle and due day."
        action={<Link href="/money/settings" className={primaryButton}>Add a card</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {data.map((card) => (
        <CardSection key={card.account.id} card={card} onAdd={() => setAdding(card.account.id)} />
      ))}
      {adding && <ManualTxnDialog defaultAccountId={adding} onClose={() => setAdding(null)} onSaved={() => void mutate()} />}
    </div>
  );
}

function CardSection({ card, onAdd }: { card: CardsData[number]; onAdd: () => void }) {
  const [index, setIndex] = useState(0);
  const a = card.account;
  const cycle = card.cycles[index];
  const lastClosed = card.cycles.find((c) => !c.isOpen && c.count > 0);
  const hasSpends = card.cycles.some((c) => c.count > 0);
  // Before any spends are tracked, the bill is what the card shows as used
  const nextBill = lastClosed?.billEstimate ?? (a.amount && Number(a.amount) > 0 ? a.amount : card.cycles[0].billEstimate);
  const nextDue = lastClosed?.dueDate ?? card.nextDue;
  const pct = a.amount && a.creditLimit ? Math.min(100, (Number(a.amount) / Number(a.creditLimit)) * 100) : null;
  const maxCat = Math.max(1, ...cycle.categories.map((c) => Number(c.amount)));

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc 55%, #0f172a)` }}>
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-2">
            <i aria-hidden="true" className="ph-fill ph-credit-card text-xl" />
            <p className="text-base font-extrabold">{a.name}</p>
            <span className="ml-auto text-sm font-bold tracking-widest text-white/75">{maskLast4(a.last4)}</span>
          </div>
          <p className="relative mt-5 text-[10px] font-extrabold uppercase tracking-wider text-white/70">Used now</p>
          <p className="relative text-3xl font-extrabold tabular-nums">{a.amount != null ? formatINR(a.amount) : formatINR("0")}</p>
          {pct != null && (
            <>
              <div className="relative mt-3 h-2 rounded-full bg-white/25">
                <div className="h-2 rounded-full bg-white" style={{ width: `${pct}%` }} />
              </div>
              <p className="relative mt-1 text-[11px] font-semibold text-white/80">{Math.round(pct)}% of {formatINR(a.creditLimit)}</p>
            </>
          )}
          <p className="relative mt-3 text-[11px] font-semibold text-white/75">
            {card.typedOutstanding && card.outstandingAsOf ? `From ${formatINR(card.typedOutstanding)} on ${formatMoneyDate(card.outstandingAsOf)}, plus spends after, minus payments.` : "Spends minus payments and refunds."}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Next bill</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{formatINR(nextBill)}</p>
          <p className="text-xs font-semibold text-slate-500">
            {lastClosed ? `Spends ${formatMoneyDate(lastClosed.from)} – ${formatMoneyDate(lastClosed.to)}` : "About what the card shows as used"}
            {nextDue ? `, due ${formatMoneyDate(nextDue)}.` : ". Set the due day in Settings to see the due date."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onAdd} className={primaryButton}><i aria-hidden="true" className="ph-bold ph-plus" /> Add spend</button>
            <Link href="/money/import" className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-file-csv" /> Import CSV</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Card bills paid</p>
          {card.payments.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-slate-400">No payments to this card found in your bank statements yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {card.payments.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                  <span>{formatMoneyDate(p.txnDate)}</span>
                  <Amount value={p.amount} tone="plain" className="text-slate-900" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {hasSpends ? (
      <Panel
        title="Billing cycles"
        subtitle={a.dueDay ? `Cycle starts on day ${card.cycleStartDay ?? 1}, bill due on day ${a.dueDay}` : `Cycle starts on day ${card.cycleStartDay ?? 1}`}
        icon="ph-calendar-blank"
      >
        <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: "none" }}>
          {card.cycles.map((c, i) => (
            <button
              key={c.from}
              type="button"
              onClick={() => setIndex(i)}
              className={`shrink-0 rounded-xl px-3 py-2 text-left transition ${i === index ? "bg-emerald-500 text-white shadow" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="block text-[11px] font-extrabold">{formatMoneyDate(c.from).slice(0, 6)} – {formatMoneyDate(c.to).slice(0, 6)}</span>
              <span className="block text-xs font-bold tabular-nums">{formatINR(c.spends)}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            ["Spends", formatINR(cycle.spends)],
            ["Refunds", formatINR(cycle.refunds)],
            ["Bill estimate", formatINR(cycle.billEstimate)],
            ["Daily average", `${formatINR(cycle.avgDailyExcludingLarge)}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="text-sm font-extrabold tabular-nums text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">The daily average leaves out large one-off spends (set the limit in Settings).</p>

        {cycle.count === 0 ? (
          <p className="mt-4 text-sm font-semibold text-slate-400">No spends in this cycle.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Top merchants</h3>
              <ul className="space-y-1.5">
                {cycle.topMerchants.map((m) => (
                  <li key={m.name} className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                    <span className="truncate">{m.name}</span>
                    <span className="font-extrabold tabular-nums text-slate-900">{formatINR(m.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Categories</h3>
              <ul className="space-y-2">
                {cycle.categories.map((c) => (
                  <li key={c.categoryId ?? "none"}>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>{c.name}</span>
                      <span className="tabular-nums text-slate-900">{formatINR(c.amount)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full" style={{ width: `${(Number(c.amount) / maxCat) * 100}%`, backgroundColor: c.color }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Largest purchases</h3>
              <ul className="space-y-1.5">
                {cycle.largest.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                    <span className="truncate">{formatMoneyDate(l.date).slice(0, 6)} · {l.name}</span>
                    <span className="font-extrabold tabular-nums text-slate-900">{formatINR(l.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Panel>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          Billing cycles show up once you add spends to this card or import its CSV.
        </p>
      )}
    </section>
  );
}
