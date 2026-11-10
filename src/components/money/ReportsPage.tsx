"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import CustomDropdown from "@/components/ui/CustomDropdown";
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker";
import { formatINR, formatMoneyDate } from "@/lib/money/format";
import type { reportsView } from "@/lib/money/server/reports";
import { EmptyState, KIND_LABELS, Panel, Segmented, Skeleton, downloadCsv, inputClass, secondaryButton } from "./ui";

type Report = Awaited<ReturnType<typeof reportsView>>;
type Cycle = Extract<Report, { type: "cycle" }>;
type Recurring = Extract<Report, { type: "recurring" }>;
type People = Extract<Report, { type: "people" }>;
type Cards = Extract<Report, { type: "cards" }>;

const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "");

export default function ReportsPage() {
  const [tab, setTab] = useState<"cycle" | "cards" | "recurring" | "people">("cycle");
  return (
    <div className="space-y-4">
      <Segmented
        label="Report"
        value={tab}
        onChange={setTab}
        options={[
          { value: "cycle", label: "Salary cycle", icon: "ph-arrows-clockwise" },
          { value: "cards", label: "Card spend", icon: "ph-credit-card" },
          { value: "recurring", label: "Recurring", icon: "ph-repeat" },
          { value: "people", label: "People", icon: "ph-users-three" },
        ]}
      />
      {tab === "cycle" && <CycleReport />}
      {tab === "cards" && <CardReport />}
      {tab === "recurring" && <RecurringReport />}
      {tab === "people" && <PeopleReport />}
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string | null; tone?: "in" | "out" | "net" }) {
  if (value == null) return null;
  const color = tone === "in" ? "text-emerald-600" : tone === "out" ? "text-rose-600" : tone === "net" && value.startsWith("-") ? "text-rose-600" : "text-slate-900";
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-sm font-extrabold tabular-nums ${color}`}>{tone === "net" && !value.startsWith("-") ? "+" : ""}{formatINR(value)}</p>
    </div>
  );
}

function CycleReport() {
  const [cycleKey, setCycleKey] = useState("");
  const [range, setRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const custom = range.start && range.end;
  const qs = custom ? `&from=${iso(range.start)}&to=${iso(range.end)}` : cycleKey ? `&from=${cycleKey.split("|")[0]}&to=${cycleKey.split("|")[1]}` : "";
  const { data } = useSWR<Cycle>(`/api/money/reports?type=cycle${qs}`, fetcher, { keepPreviousData: true });
  if (!data) return <Skeleton className="h-80" />;
  const max = Math.max(1, ...data.combined.spending.map((s) => Number(s.amount)));

  const exportCsv = () =>
    downloadCsv(`cycle-${data.from}-to-${data.to}.csv`, [
      ["Account", "Opening", "External in", "External out", "Net", "Self transfers in", "Self transfers out", "Card bills paid", "Closing"],
      ["All banks", data.combined.opening, data.combined.externalIn, data.combined.externalOut, data.combined.net, data.combined.selfIn, data.combined.selfOut, data.combined.cardBillsPaid, data.combined.closing],
      ...data.perAccount.map((p) => [p.name, p.opening, p.externalIn, p.externalOut, p.net, p.selfIn, p.selfOut, p.cardBillsPaid, p.closing]),
      [],
      ["Category", "Spent", "Count"],
      ...data.combined.spending.map((s) => [s.name, s.amount, s.count]),
    ]);

  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <CustomDropdown
            options={data.cycles.map((c) => ({ value: `${c.from}|${c.to}`, label: `${formatMoneyDate(c.from)} – ${formatMoneyDate(c.to)} · salary ${formatINR(c.salary)}` }))}
            value={custom ? "" : cycleKey || (data.cycles[0] ? `${data.cycles[0].from}|${data.cycles[0].to}` : "")}
            onChange={(v) => {
              setCycleKey(v);
              setRange({ start: null, end: null });
            }}
            placeholder={data.cycles.length ? "Choose a salary cycle" : "No salary credits imported yet"}
          />
          <CustomDateRangePicker value={range} onChange={setRange} placeholder="Or pick any dates" />
          <button type="button" onClick={exportCsv} className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-file-csv" /> Download CSV</button>
        </div>
      </Panel>

      <Panel title="All bank accounts" subtitle={`${formatMoneyDate(data.from)} – ${formatMoneyDate(data.to)}. Self transfers are left out of in and out.`} icon="ph-bank">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Figure label="Opening" value={data.combined.opening} />
          <Figure label="External in" value={data.combined.externalIn} tone="in" />
          <Figure label="External out" value={data.combined.externalOut} tone="out" />
          <Figure label="Net" value={data.combined.net} tone="net" />
          <Figure label="Closing" value={data.combined.closing} />
          <Figure label="Self transfers" value={data.combined.selfOut} />
          <Figure label="Card bills paid" value={data.combined.cardBillsPaid} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Spending by category</h3>
            {data.combined.spending.length === 0 ? (
              <p className="text-sm font-semibold text-slate-400">No spending in this period.</p>
            ) : (
              <ul className="space-y-2">
                {data.combined.spending.map((s) => (
                  <li key={s.categoryId ?? "none"}>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>{s.name} <span className="text-slate-400">· {s.count}</span></span>
                      <span className="tabular-nums text-slate-900">{formatINR(s.amount)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${(Number(s.amount) / max) * 100}%`, backgroundColor: s.color }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Money in</h3>
            <ul className="space-y-1.5">
              {data.combined.income.map((i) => (
                <li key={i.kind} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>{KIND_LABELS[i.kind]?.label ?? i.kind}</span>
                  <span className="font-extrabold tabular-nums text-emerald-600">{formatINR(i.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.perAccount.map((p) => (
          <Panel key={p.accountId} title={p.name} icon="ph-bank">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Figure label="Opening" value={p.opening} />
              <Figure label="In" value={p.externalIn} tone="in" />
              <Figure label="Out" value={p.externalOut} tone="out" />
              <Figure label="Net" value={p.net} tone="net" />
              <Figure label="Closing" value={p.closing} />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">Self transfers: {formatINR(p.selfIn)} in, {formatINR(p.selfOut)} out. Card bills paid: {formatINR(p.cardBillsPaid)}.</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function CardReport() {
  const { data } = useSWR<Cards>("/api/money/reports?type=cards", fetcher);
  if (!data) return <Skeleton className="h-80" />;
  if (data.cards.length === 0) return <EmptyState icon="ph-credit-card" title="No cards yet" text="Add your cards in Settings." />;
  return (
    <div className="space-y-4">
      {data.cards.map((c) => (
        <Panel
          key={c.account.id}
          title={c.account.name}
          subtitle="Each billing cycle: spends, bill estimate and the daily average without large one-offs."
          icon="ph-credit-card"
          actions={
            <button
              type="button"
              className={secondaryButton}
              onClick={() =>
                downloadCsv(`${c.account.name}-cycles.csv`, [
                  ["From", "To", "Spends", "Refunds", "Bill estimate", "Due", "Paid", "Daily average (no large)", "Top merchant"],
                  ...c.cycles.map((x) => [x.from, x.to, x.spends, x.refunds, x.billEstimate, x.dueDate ?? "", x.paymentsMade, x.avgDailyExcludingLarge, x.topMerchants[0]?.name ?? ""]),
                ])
              }
            >
              <i aria-hidden="true" className="ph-bold ph-file-csv" /> CSV
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-2 py-2 text-left">Cycle</th>
                  <th className="px-2 py-2 text-right">Spends</th>
                  <th className="px-2 py-2 text-right">Bill</th>
                  <th className="px-2 py-2 text-right">Due</th>
                  <th className="px-2 py-2 text-right">Paid</th>
                  <th className="px-2 py-2 text-right">Daily avg</th>
                  <th className="px-2 py-2 text-left">Top merchant</th>
                </tr>
              </thead>
              <tbody>
                {c.cycles.map((x) => (
                  <tr key={x.from} className="border-t border-slate-50 font-semibold text-slate-600">
                    <td className="px-2 py-2 whitespace-nowrap">{formatMoneyDate(x.from).slice(0, 6)} – {formatMoneyDate(x.to).slice(0, 6)}{x.isOpen ? <span className="ml-1 rounded-full bg-emerald-50 px-1.5 text-[10px] font-extrabold text-emerald-600">now</span> : null}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-extrabold text-slate-900">{formatINR(x.spends)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatINR(x.billEstimate)}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{x.dueDate ? formatMoneyDate(x.dueDate).slice(0, 6) : ""}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatINR(x.paymentsMade)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatINR(x.avgDailyExcludingLarge)}</td>
                    <td className="px-2 py-2 truncate max-w-[160px]">{x.topMerchants[0]?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function RecurringReport() {
  const { data } = useSWR<Recurring>("/api/money/reports?type=recurring", fetcher);
  if (!data) return <Skeleton className="h-80" />;
  return (
    <Panel
      title="Recurring payments"
      subtitle="Paid in 3 or more different months at about the same amount, over the last 6 months."
      icon="ph-repeat"
      actions={data.rows.length > 0 && <button type="button" className={secondaryButton} onClick={() => downloadCsv("recurring.csv", [["Payee", "Typical amount", "Usual day", "Months", "Times", "Last paid", "Total"], ...data.rows.map((r) => [r.name, r.typicalAmount, r.usualDay, r.months, r.count, r.lastDate, r.total])])}><i aria-hidden="true" className="ph-bold ph-file-csv" /> CSV</button>}
    >
      {data.rows.length === 0 ? (
        <p className="text-sm font-semibold text-slate-400">Nothing recurring found yet. A few months of statements are needed.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {data.rows.map((r) => (
            <li key={r.name} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-800">{r.name}</p>
                <p className="text-[11px] font-semibold text-slate-400">Around day {r.usualDay} · {r.months} months · last {formatMoneyDate(r.lastDate)}</p>
              </div>
              <span className="text-sm font-extrabold tabular-nums text-slate-900">{formatINR(r.typicalAmount)}<span className="text-[11px] text-slate-400"> /month</span></span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PeopleReport() {
  const { data } = useSWR<People>("/api/money/reports?type=people", fetcher);
  const [q, setQ] = useState("");
  if (!data) return <Skeleton className="h-80" />;
  const rows = data.rows.filter((r) => r.name.toUpperCase().includes(q.trim().toUpperCase()));
  return (
    <Panel
      title="People ledger"
      subtitle="Money sent to and received from each person or payee. Self transfers, card bills and salary are left out."
      icon="ph-users-three"
      actions={data.rows.length > 0 && <button type="button" className={secondaryButton} onClick={() => downloadCsv("people.csv", [["Name", "Sent", "Received", "Net", "Transactions", "Last"], ...rows.map((r) => [r.name, r.sent, r.received, r.net, r.count, r.lastDate])])}><i aria-hidden="true" className="ph-bold ph-file-csv" /> CSV</button>}
    >
      <div className="relative mb-3">
        <i aria-hidden="true" className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person" className={`${inputClass} pl-9`} />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm font-semibold text-slate-400">No one found.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {rows.slice(0, 200).map((r) => (
            <li key={r.name} className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-5 sm:items-center">
              <div className="col-span-2 min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-800">{r.name}</p>
                <p className="text-[11px] font-semibold text-slate-400">{r.count} transaction{r.count === 1 ? "" : "s"} · last {formatMoneyDate(r.lastDate)}</p>
              </div>
              <p className="text-xs font-bold text-rose-600 tabular-nums sm:text-right">Sent {formatINR(r.sent)}</p>
              <p className="text-xs font-bold text-emerald-600 tabular-nums sm:text-right">Got {formatINR(r.received)}</p>
              <p className={`text-sm font-extrabold tabular-nums sm:text-right ${r.net.startsWith("-") ? "text-rose-600" : "text-emerald-600"}`}>{r.net.startsWith("-") ? "" : "+"}{formatINR(r.net)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
