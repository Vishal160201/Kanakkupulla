"use client";

import Link from "next/link";
import useSWR from "swr";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetcher } from "@/lib/fetcher";
import { formatINR, formatMoneyDate, maskLast4 } from "@/lib/money/format";
import type { dashboardView } from "@/lib/money/server/overview";
import { Amount, EmptyState, Panel } from "./ui";

export type DashboardData = Awaited<ReturnType<typeof dashboardView>>;

const ALERT_TONES = {
  danger: "border-rose-100 bg-rose-50 text-rose-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  info: "border-sky-100 bg-sky-50 text-sky-700",
};

const shortDate = (iso: string) => formatMoneyDate(iso).slice(0, 6);

export default function Dashboard({ initial }: { initial: DashboardData }) {
  const { data = initial } = useSWR<DashboardData>("/api/money/dashboard", fetcher, { fallbackData: initial });
  const { bal, balances, alerts, cycle, forecast } = data;

  if (balances.length === 0) {
    return (
      <EmptyState
        icon="ph-bank"
        title="Set up your accounts first"
        text="Add HDFC savings, KVB savings and your cards in Settings. Statements, self transfers and Bal for EMI build on them."
        action={<Link href="/money/settings" className="h-11 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white">Add accounts</Link>}
      />
    );
  }

  const negative = bal.balForEmi.startsWith("-");
  const fronted = Number(bal.frontedForOthers) > 0;
  const frontedNames = bal.pairs.filter((p) => Number(p.fronted) > 0).map((p) => p.receivableName).join(", ");
  const chart = forecast.points.map((p) => ({ date: p.date, balance: Number(p.balance), events: p.events }));
  const maxSpend = Math.max(1, ...cycle.spending.map((s) => Number(s.amount)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Bal for EMI */}
        <Link
          href="/money/commitments"
          className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-lg lg:col-span-2 transition hover:brightness-105 ${negative ? "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500" : "bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600"}`}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10" />
          <p className="relative text-xs font-extrabold uppercase tracking-[2px] text-white/80">Bal for EMI</p>
          <p className="relative mt-1 text-[2.5rem] leading-tight md:text-5xl font-extrabold tabular-nums">{formatINR(bal.balForEmi)}</p>
          <p className="relative mt-2 text-sm font-semibold text-white/85">
            {negative ? "Short after every commitment is paid." : "Left after every commitment is paid."} Tap to see how it adds up.
          </p>
          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Available", bal.poolMoney],
              ["Incoming", bal.incoming],
              ["Bills & owed", bal.bills],
              ["Savings held", bal.savingsHeld],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/75">{label}</p>
                <p className="text-sm font-extrabold tabular-nums">{formatINR(value)}</p>
              </div>
            ))}
          </div>
        </Link>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm flex flex-col justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Cash position</p>
            <p className={`mt-1 text-2xl sm:text-3xl font-extrabold tabular-nums ${bal.cashPosition.startsWith("-") ? "text-rose-600" : "text-slate-900"}`}>{formatINR(bal.cashPosition)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {fronted
                ? `${formatINR(bal.frontedForOthers)} paid for ${frontedNames}, not yet received.`
                : "Same as Bal for EMI: nothing paid for others is still outstanding."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">In the bank</p>
              <p className="text-base font-extrabold tabular-nums text-slate-900">{formatINR(data.totalBank)}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Used on cards</p>
              <p className="text-base font-extrabold tabular-nums text-slate-900">{formatINR(data.totalCards)}</p>
            </div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {alerts.map((a) => {
            const body = (
              <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${ALERT_TONES[a.level]}`}>
                <i aria-hidden="true" className={`ph-fill ${a.icon} text-xl mt-0.5`} />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">{a.title}</p>
                  {a.detail && <p className="text-xs font-semibold opacity-80">{a.detail}</p>}
                </div>
              </div>
            );
            return a.href ? <Link key={a.id} href={a.href} className="block transition hover:brightness-95">{body}</Link> : <div key={a.id}>{body}</div>;
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {balances.map((b) => {
          const isCard = b.type === "CREDIT_CARD";
          const pct = isCard && b.amount && b.creditLimit ? Math.min(100, (Number(b.amount) / Number(b.creditLimit)) * 100) : null;
          return (
            <div key={b.id} className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${b.color}, ${b.color}cc 55%, #0f172a)` }}>
              <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-1.5 sm:gap-2">
                <i aria-hidden="true" className={`ph-fill ${isCard ? "ph-credit-card" : "ph-bank"} text-base sm:text-lg`} />
                <p className="truncate text-xs sm:text-sm font-extrabold">{b.name}</p>
                <span className="ml-auto hidden sm:inline text-xs font-bold tracking-widest text-white/70">{maskLast4(b.last4)}</span>
              </div>
              <p className="relative mt-3 sm:mt-4 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-white/70">{isCard ? "Used" : b.isPool ? "Available money" : "Balance"}</p>
              <p className="relative text-lg sm:text-2xl font-extrabold tabular-nums leading-tight">{b.amount != null ? formatINR(b.amount) : isCard ? "No spends yet" : "No statement yet"}</p>
              {pct != null && (
                <div className="relative mt-2 h-1.5 rounded-full bg-white/25">
                  <div className="h-1.5 rounded-full bg-white" style={{ width: `${pct}%` }} />
                </div>
              )}
              <p className="relative mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] font-semibold text-white/75 line-clamp-2">
                {[b.asOf && !isCard ? `${b.source === "manual" ? "Typed in" : "Statement"} · ${formatMoneyDate(b.asOf)}` : null, isCard && b.creditLimit ? `Limit ${formatINR(b.creditLimit)}` : null, isCard && b.dueDay ? `Due day ${b.dueDay}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title={`Next ${forecast.points.length - 1} days`}
          subtitle={`Available money, with due dates. Lowest: ${formatINR(forecast.lowest.balance)} on ${formatMoneyDate(forecast.lowest.date)}.`}
          icon="ph-chart-line"
        >
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="moneyForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#94a3b8" }} interval="preserveStartEnd" minTickGap={30} />
                <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} width={44} />
                <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 4" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)" }}
                  labelFormatter={(d) => formatMoneyDate(String(d))}
                  formatter={(v, _n, item) => {
                    const events = (item?.payload as { events?: { label: string; amount: string }[] })?.events ?? [];
                    const detail = events.map((e) => `${e.label} ${formatINR(e.amount)}`).join(", ");
                    return [`${formatINR(Number(v).toFixed(2))}${detail ? ` (${detail})` : ""}`, "Available"];
                  }}
                />
                <Area type="stepAfter" dataKey="balance" stroke="#10b981" strokeWidth={2.5} fill="url(#moneyForecast)" />
                <ReferenceDot x={forecast.lowest.date} y={Number(forecast.lowest.balance)} r={6} fill="#f43f5e" stroke="#fff" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {forecast.points.some((p) => p.events.length > 0) && (
            <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {forecast.points.flatMap((p) => p.events.map((e, i) => ({ ...e, day: p.date, key: `${p.date}-${i}` }))).slice(0, 8).map((e) => (
                <li key={e.key} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  <span className="truncate">{shortDate(e.day)} · {e.label}</span>
                  <Amount value={e.amount} className="text-xs" />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="xl:col-span-2" title="This salary cycle" subtitle={`${formatMoneyDate(cycle.from)} – ${formatMoneyDate(cycle.to)}`} icon="ph-chart-pie-slice">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              ["In", cycle.externalIn, "text-emerald-600"],
              ["Out", cycle.externalOut, "text-rose-600"],
              ["Net", cycle.net, cycle.net.startsWith("-") ? "text-rose-600" : "text-slate-900"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
                <p className={`text-sm font-extrabold tabular-nums ${color}`}>{formatINR(value)}</p>
              </div>
            ))}
          </div>
          {cycle.spending.length === 0 ? (
            <p className="text-sm font-semibold text-slate-400">No spending in this cycle yet. Import a statement to see it here.</p>
          ) : (
            <ul className="space-y-2.5">
              {cycle.spending.slice(0, 8).map((s) => (
                <li key={s.categoryId ?? "none"}>
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1.5 truncate">
                      <i aria-hidden="true" className={`ph-fill ${s.icon}`} style={{ color: s.color }} /> {s.name}
                    </span>
                    <span className="tabular-nums text-slate-900">{formatINR(s.amount)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full" style={{ width: `${(Number(s.amount) / maxSpend) * 100}%`, backgroundColor: s.color }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
