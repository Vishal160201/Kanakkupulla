"use client";

import { useState } from "react";
import Link from "next/link";
import type { HeatmapSegment } from "./overviewData";

interface ExpenseHeatmapCardProps {
  totalExpenses: number;
  segments: HeatmapSegment[];
}

export default function ExpenseHeatmapCard({ totalExpenses, segments }: ExpenseHeatmapCardProps) {
  const [hoveredHeatCat, setHoveredHeatCat] = useState<string | null>(null);

  return (
    <div className="h-full bg-white rounded-[24px] p-5 xl:p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F0F2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
            <i className="ph-bold ph-chart-pie-slice text-xl"></i>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 leading-tight">Expense Heatmap</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">Category split</p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors shrink-0">
          <i className="ph-bold ph-chart-pie text-base"></i>
        </div>
      </div>

      {/* Chart and Legend Area */}
      <div className="grid grid-cols-1 min-[430px]:grid-cols-[128px_minmax(0,1fr)] lg:grid-cols-1 2xl:grid-cols-[128px_minmax(0,1fr)] gap-5 mb-5 items-center flex-1">
        <div className="flex justify-center items-center relative w-32 h-32 shrink-0 mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 overflow-visible">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
            {totalExpenses > 0 ? segments.map((seg, i) => (
              <circle
                key={seg.category}
                cx="50" cy="50" r="40" fill="none"
                stroke={seg.color.stroke}
                strokeWidth={hoveredHeatCat === seg.category ? 15 : 12}
                strokeDasharray={seg.dasharray}
                strokeDashoffset={seg.dasharray}
                transform={`rotate(${seg.rotation} 50 50)`}
                className="transition-all duration-300"
                onMouseEnter={() => setHoveredHeatCat(seg.category)}
                onMouseLeave={() => setHoveredHeatCat(null)}
              >
                <animate attributeName="stroke-dashoffset" from={seg.dasharray} to={seg.dashoffset} dur="1.2s" begin={`${450 + (i * 90)}ms`} fill="freeze" />
              </circle>
            )) : null}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[0.6rem] font-bold text-slate-400 tracking-widest mb-0.5">TOTAL</span>
            <span className="text-lg font-black text-slate-900 leading-none">₹{totalExpenses.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 justify-center w-full max-w-[240px] mx-auto">
          {segments.slice(0, 4).map((seg) => (
            <div
              key={seg.category}
              className="flex items-center justify-between group cursor-default gap-2"
              onMouseEnter={() => setHoveredHeatCat(seg.category)}
              onMouseLeave={() => setHoveredHeatCat(null)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl ${seg.color.bg} ${seg.color.text} flex items-center justify-center shrink-0`}>
                  <i className={`ph-fill ${seg.icon} text-base`}></i>
                </div>
                <span className="text-xs xl:text-[0.8rem] font-bold text-slate-800 truncate">{seg.category}</span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs font-black text-slate-800">{Math.round(seg.pct * 100)}%</span>
                <span className="text-[0.65rem] font-bold text-slate-400 whitespace-nowrap">₹{seg.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          ))}
          {segments.length === 0 && (
            <span className="text-xs text-slate-400 text-center py-4">No expenses recorded.</span>
          )}
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-auto pt-2">
        <Link href="/transactions/allTransactions?view=week&type=EXPENSE" className="text-sm font-extrabold text-[#4F46E5] hover:text-indigo-700 flex items-center gap-2 w-fit">
          View all expenses <i className="ph-bold ph-arrow-right"></i>
        </Link>
      </div>
    </div>
  );
}
