"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, type MouseHandlerDataParam
} from "recharts";
import { Briefcase, TrendingUp, X } from "lucide-react";
import { formatThousands, type DailyTrendPoint, type RevenueIntelligencePoint } from "./types";

interface RevenueIntelligenceCardProps {
  data: RevenueIntelligencePoint[];
  activeDateFilter: string | null;
  onDateFilterChange: (date: string | null) => void;
}

/** Section 2: Revenue Intelligence (Stacked Bar); clicking a bar filters Daily Trends. */
export function RevenueIntelligenceCard({ data, activeDateFilter, onDateFilterChange }: RevenueIntelligenceCardProps) {
  const handleChartClick = (state: MouseHandlerDataParam) => {
    if (state && state.activeLabel) {
      const label = String(state.activeLabel);
      onDateFilterChange(activeDateFilter === label ? null : label);
    }
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Briefcase size={18} className="text-indigo-500"/> Revenue Intelligence</h3>
        {activeDateFilter && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold text-indigo-700 fade-in">
            <span>{activeDateFilter}</span>
            <button type="button" aria-label="Clear date filter" onClick={() => onDateFilterChange(null)} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"><X size={12} /></button>
          </div>
        )}
      </div>
      <div className="h-[200px] lg:h-[300px] w-full shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatThousands} />
            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="Bookings" stackId="a" fill="#6366f1" isAnimationActive={true} animationDuration={1000} className="cursor-pointer" />
            <Bar dataKey="Gifts" stackId="a" fill="#ec4899" isAnimationActive={true} animationDuration={1000} className="cursor-pointer" />
            <Bar dataKey="Xerox/PP" stackId="a" fill="#14b8a6" isAnimationActive={true} animationDuration={1000} className="cursor-pointer" />
            <Bar dataKey="Other" stackId="a" fill="#94a3b8" isAnimationActive={true} animationDuration={1000} radius={[4, 4, 0, 0]} className="cursor-pointer" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Section 7: Daily Trends */
export function DailyTrendsCard({ data }: { data: DailyTrendPoint[] }) {
  return (
    <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-500"/> Daily Trends
        </h3>
      </div>
      <div className="h-[200px] lg:h-[300px] w-full shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatThousands} />
            <Tooltip contentStyle={{ borderRadius: '12px' }} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} isAnimationActive={true} />
            <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} isAnimationActive={true} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
