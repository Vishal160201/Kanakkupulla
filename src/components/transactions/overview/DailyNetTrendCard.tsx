"use client";

import { useState } from "react";
import Link from "next/link";
import type { WeeklyFlow } from "./overviewData";

/** Minimum SVG-unit distance between two y-axis labels before they overlap. */
const TICK_GAP = 14;

const formatAxisValue = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);

type DailyNetTrendCardProps = Pick<WeeklyFlow, 'dayLabels' | 'netValues' | 'netMin' | 'netMax' | 'netPoints' | 'netZeroY' | 'netPath' | 'netAreaPath'>;

export default function DailyNetTrendCard({ dayLabels, netValues, netMin, netMax, netPoints, netZeroY, netPath, netAreaPath }: DailyNetTrendCardProps) {
  const [hoveredNetDay, setHoveredNetDay] = useState<number | null>(null);
  const activeNetDay = hoveredNetDay ?? netValues.indexOf(Math.max(...netValues));

  // Max/min are plotted at y=20/85 (see buildWeeklyFlow); drop any that would collide with ₹0.
  const axisTicks = [
    { label: formatAxisValue(netMax), y: 20, show: netMax > 0 && netZeroY - 20 >= TICK_GAP },
    { label: '₹0', y: netZeroY, show: true },
    { label: formatAxisValue(netMin), y: 85, show: netMin < 0 && 85 - netZeroY >= TICK_GAP },
  ].filter(tick => tick.show);

  return (
    <div className="h-full bg-white rounded-[24px] p-5 xl:p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F0F2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
            <i className="ph-bold ph-trend-up text-xl"></i>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 leading-tight truncate">Daily Net Trend</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">This week</p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl border border-gray-200 text-slate-400 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors shrink-0">
          <i className="ph-bold ph-calendar-blank text-base"></i>
        </div>
      </div>

      {/* Top Values */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <span className="text-2xl font-black text-slate-900 leading-none block mb-1">₹{netValues[activeNetDay]?.toLocaleString('en-IN')}</span>
          <span className="text-sm font-bold text-[#4F46E5]">{dayLabels[activeNetDay]}</span>
        </div>
        <div className="bg-[#ECFDF5] text-[#059669] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0">
          <i className="ph-bold ph-arrow-up"></i> 12% vs last week
        </div>
      </div>

      <div className="mt-auto w-full flex flex-col">
        {/* Chart Area */}
        <div className="flex h-[178px] relative mb-5">
        {/* Y Axis: labels sit at the same SVG y as the values they name */}
        <div className="pb-6 pr-2 sm:pr-4 w-10 sm:w-12 shrink-0">
          <div className="relative h-full text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-400">
            {axisTicks.map(tick => (
              <span key={tick.label} className="absolute left-0 -translate-y-1/2 whitespace-nowrap" style={{ top: `${(tick.y / 120) * 100}%` }}>
                {tick.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-1 relative pb-6">
           <svg viewBox="0 0 280 120" className="w-full h-full overflow-visible" aria-hidden="true" preserveAspectRatio="none">
              <defs>
                <linearGradient id="netTrendStrokeNew" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id="netTrendFillNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Zero Line */}
              <line x1="10" y1={netZeroY} x2="270" y2={netZeroY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

              {/* Area and Line */}
              <path d={netAreaPath} fill="url(#netTrendFillNew)" />
              <path d={netPath} fill="none" stroke="url(#netTrendStrokeNew)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Points */}
              {netPoints.map((point, idx) => (
                <g key={`point-${idx}`}>
                  {activeNetDay === idx && (
                     <line x1={point.x} y1={point.y} x2={point.x} y2="120" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                  )}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={activeNetDay === idx ? 5 : 4}
                    fill={activeNetDay === idx ? "#4f46e5" : "#ffffff"}
                    stroke={activeNetDay === idx ? "#ffffff" : "#4f46e5"}
                    strokeWidth="2.5"
                  />
                </g>
              ))}
           </svg>
           <div className="absolute inset-0 pointer-events-none flex justify-between items-end pb-0">
              {dayLabels.map((day, idx) => (
                <span key={day} className={`text-[0.6rem] sm:text-[0.7rem] font-bold uppercase ${activeNetDay === idx ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
                  {day}
                </span>
              ))}
           </div>
           {/* Tooltip Overlay */}
           <div className="absolute inset-0 pointer-events-none z-20 pb-6">
              {netPoints.map((point, idx) => (
                 activeNetDay === idx && (
                   <div key={`tooltip-${idx}`} className="absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] flex flex-col items-center drop-shadow-md" style={{ left: `${(point.x/280)*100}%`, top: `${(point.y/120)*100}%` }}>
                     <div className="bg-[#8B5CF6] text-white text-[0.65rem] sm:text-[0.7rem] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                       ₹{netValues[idx].toLocaleString('en-IN')}
                     </div>
                     <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-[#8B5CF6]"></div>
                   </div>
                 )
              ))}
           </div>
           {/* Invisible overlay for interaction */}
           <div className="absolute inset-0 flex z-10 pb-6">
              {netPoints.map((_, idx) => (
                 <div key={idx} className="flex-1 h-full cursor-pointer" onMouseEnter={() => setHoveredNetDay(idx)} onMouseLeave={() => setHoveredNetDay(null)}></div>
              ))}
           </div>
        </div>
      </div>

        <div className="pt-2">
          <Link href="/transactions/allTransactions?view=week" className="text-sm font-extrabold text-[#4F46E5] hover:text-indigo-700 flex items-center gap-2 w-fit">
            View full trend <i className="ph-bold ph-arrow-right"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}
