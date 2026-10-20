"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, type MouseHandlerDataParam
} from "recharts";
import { ShoppingBag, Target, Tag, X } from "lucide-react";
import type { FunnelStage, GiftsPerformance } from "./types";

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];
const STATUS_COLORS: Record<string, string> = {
  'PENDING': '#f59e0b',
  'IN PRODUCTION': '#64748b',
  'READY': '#ea580c',
  'DELIVERED': '#14b8a6',
  'SHIPPED': '#3b82f6'
};

/** Section 3: Booking Funnel */
export function BookingFunnelCard({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-[400px]">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Target size={18} className="text-rose-500"/> Booking Funnel</h3>
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {stages.map((stage, i) => {
          const prev = i > 0 ? stages[i-1].count : null;
          const conversion = prev && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
          return (
            <div key={stage.stage} className="flex flex-col gap-1">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-100">
                <span className="text-sm font-bold text-slate-700">{stage.stage}</span>
                <span className="text-lg font-extrabold text-indigo-600">{stage.count}</span>
              </div>
              {conversion !== null && (
                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-white border border-slate-200 text-[0.65rem] font-bold text-slate-500 px-2 py-0.5 rounded-full">
                    {conversion}%
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}

interface GiftsPerformanceCardProps {
  giftsPerformance: GiftsPerformance;
  activeProductFilter: string | null;
  onProductFilterChange: (product: string | null) => void;
}

/** Section 4: Gifts Performance; clicking a product filters the overdue list. */
export function GiftsPerformanceCard({ giftsPerformance, activeProductFilter, onProductFilterChange }: GiftsPerformanceCardProps) {
  const handleChartClick = (state: MouseHandlerDataParam) => {
    if (state && state.activeLabel) {
      const label = String(state.activeLabel);
      onProductFilterChange(activeProductFilter === label ? null : label);
    }
  };
  const totalDiscountGiven = giftsPerformance?.totalDiscountGiven ?? 0;

  return (
    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ShoppingBag size={18} className="text-amber-500"/> Gifts Performance</h3>
        <div className="flex items-center gap-2">
          {totalDiscountGiven > 0 && (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-[0.7rem] font-bold text-indigo-700 shadow-sm">
              <Tag size={12} />
              Total Discount: ₹{totalDiscountGiven.toLocaleString('en-IN')}
            </div>
          )}
          {activeProductFilter && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full text-xs font-bold text-amber-700 fade-in">
              <span>{activeProductFilter}</span>
              <button type="button" aria-label="Clear product filter" onClick={() => onProductFilterChange(null)} className="hover:bg-amber-200 rounded-full p-0.5 transition-colors"><X size={12} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        <div className="flex-1 flex flex-col h-[200px] lg:h-auto">
          <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-2">Top Products</h4>
          <div className="flex-1 min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={giftsPerformance.topProducts} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                onClick={handleChartClick}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} animationDuration={1200} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="w-px bg-slate-100 hidden lg:block"></div>

        <div className="flex-1 flex flex-col h-[260px] lg:h-auto">
          <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-2">Order Status</h4>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={giftsPerformance.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="45%" outerRadius="75%" paddingAngle={5} isAnimationActive={true}>
                  {giftsPerformance.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
