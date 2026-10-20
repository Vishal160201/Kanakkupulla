import {
  TrendingUp, TrendingDown, DollarSign, Target, ShoppingBag, PieChart as PieChartIcon, Info
} from "lucide-react";
import { formatCurrency, type AnalyticsMetrics } from "./types";

export function SmartInsightsPanel({ isLoading, insights }: { isLoading: boolean; insights: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in-up delay-100 min-h-[72px]">
      {isLoading ? (
        <>
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl h-full w-full skeleton-pulse shadow-sm"></div>
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl h-full w-full skeleton-pulse shadow-sm"></div>
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl h-full w-full skeleton-pulse shadow-sm hidden lg:block"></div>
        </>
      ) : (
        insights.map((insight, idx) => (
          <div key={idx} className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0"><Info size={18} /></div>
            <p className="text-sm font-bold text-indigo-900 leading-snug">{insight}</p>
          </div>
        ))
      )}
    </div>
  );
}

export function KpiStrip({ metrics }: { metrics: AnalyticsMetrics }) {
  const kpis = [
    { label: "Total Revenue", val: formatCurrency(metrics.totalRevenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Expenses", val: formatCurrency(metrics.totalExpenses), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    { label: "Net Profit", val: formatCurrency(metrics.netProfit), icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Collection Rate", val: `${metrics.collectionRate}%`, icon: PieChartIcon, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Avg Order Value", val: formatCurrency(metrics.avgOrderValue), icon: ShoppingBag, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
    { label: "Growth Velocity", val: metrics.growthVelocity === 'New' ? 'New' : `${metrics.growthVelocity}%`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 fade-in-up delay-200">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
            <kpi.icon size={20} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">{kpi.val}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
