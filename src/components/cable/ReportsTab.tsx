"use client";

import { EmptyState, ErrorState, ListSkeleton, cardClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatINR } from "@/components/inventory/inventoryUtils";
import { cn } from "@/lib/utils";
import { useCableReport } from "./useCableData";

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
};
const inr = (n: number) => formatINR(n, { decimals: false });

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={cn(cardClass, "p-4 sm:p-5")}>
      <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
      {hint && <p className="text-xs font-semibold text-slate-400 mb-3">{hint}</p>}
      {children}
    </section>
  );
}

/** A row with a bar showing its share of the largest value. */
function BarRow({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-800 truncate">{label}</span>
        <span className="font-extrabold text-slate-900 whitespace-nowrap">
          {inr(value)}
          {detail && <span className="ml-1 text-xs font-semibold text-slate-400">{detail}</span>}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 0}%` }} />
      </div>
    </li>
  );
}

/** Last 6 months: renewals, billed vs collected, wallet top-ups and margin; revenue by plan and area. */
export default function ReportsTab({ shopId }: { shopId: string }) {
  const { data, error, mutate } = useCableReport(shopId);
  if (error) return <div className={cardClass}><ErrorState message={errorMessage(error)} onRetry={() => mutate()} /></div>;
  if (!data) return <div className={cn(cardClass, "p-4")}><ListSkeleton rows={4} /></div>;

  const maxPlan = Math.max(0, ...data.byPlan.map((p) => p.billed));
  const maxArea = Math.max(0, ...data.byArea.map((a) => a.collected));
  const totalSubs = data.statusCounts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card title="Month by month" hint="Margin = collected from subscribers − Wallet Top-up entries in Daily Kanakku">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400 text-right">
                <th className="text-left py-2 px-1">Month</th>
                <th className="py-2 px-1">Renewals</th>
                <th className="py-2 px-1">Billed</th>
                <th className="py-2 px-1">Collected</th>
                <th className="py-2 px-1">Wallet top-ups</th>
                <th className="py-2 px-1">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...data.months].reverse().map((m) => (
                <tr key={m.month} className="text-right font-semibold text-slate-700">
                  <td className="text-left py-2.5 px-1 font-bold text-slate-900">{monthLabel(m.month)}</td>
                  <td className="py-2.5 px-1">{m.renewals}</td>
                  <td className="py-2.5 px-1">{inr(m.billed)}</td>
                  <td className="py-2.5 px-1 text-emerald-700">{inr(m.collected)}</td>
                  <td className="py-2.5 px-1 text-rose-600">{inr(m.walletTopUps)}</td>
                  <td className={cn("py-2.5 px-1 font-extrabold", m.margin < 0 ? "text-rose-600" : "text-slate-900")}>
                    {m.margin < 0 ? "−" : ""}
                    {inr(Math.abs(m.margin))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <Card title="Billed by plan" hint="Renewals in the last 6 months">
          {data.byPlan.length === 0 ? (
            <EmptyState icon="chart-bar" title="No renewals yet" className="py-6" />
          ) : (
            <ul>
              {data.byPlan.map((p) => (
                <BarRow key={p.plan} label={p.plan} value={p.billed} max={maxPlan} detail={`· ${p.renewals}`} />
              ))}
            </ul>
          )}
        </Card>
        <Card title="Collected by area" hint="Payments in the last 6 months">
          {data.byArea.length === 0 ? (
            <EmptyState icon="map-pin" title="No collections yet" className="py-6" />
          ) : (
            <ul>
              {data.byArea.map((a) => (
                <BarRow key={a.area} label={a.area} value={a.collected} max={maxArea} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Subscribers" hint="Status in TIC Fiber now">
        <div className="flex flex-wrap gap-2">
          {data.statusCounts.map((c) => (
            <span key={c.status} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
              {c.status} · {c.count}
              <span className="text-slate-400 font-semibold"> ({totalSubs ? Math.round((c.count / totalSubs) * 100) : 0}%)</span>
            </span>
          ))}
          <span className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">Removed from TIC Fiber · {data.removed}</span>
        </div>
      </Card>
    </div>
  );
}
