"use client";

import { useState, type ReactNode } from "react";
import { getRelatableIcon } from "../categoryStyles";
import type { TodaySegment } from "./overviewData";

interface TodayCategoryCardProps {
  title: string;
  headerClassName: string;
  emptyText: string;
  totalLabel: string;
  total: number;
  segments: TodaySegment[];
  /** Max legend rows (all segments are always drawn in the donut). */
  legendLimit?: number;
  formatAmount: (amount: number) => string;
  formatPct: (pct: number) => string;
  animationDelay: string;
  footer: ReactNode;
}

/** Donut + legend card for today's income sources / expense breakdown. */
export default function TodayCategoryCard({
  title,
  headerClassName,
  emptyText,
  totalLabel,
  total,
  segments,
  legendLimit,
  formatAmount,
  formatPct,
  animationDelay,
  footer,
}: TodayCategoryCardProps) {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const legend = legendLimit === undefined ? segments : segments.slice(0, legendLimit);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay }}>
      <div className={headerClassName}>
        <h3 className="text-[#0B1E40] font-black text-[1.05rem]">{title}</h3>
      </div>
      <div className="flex-1 p-4 sm:p-5 flex flex-row items-center justify-between gap-4">
        {total === 0 ? (
          <div className="w-full text-center text-slate-400 py-10 text-sm">{emptyText}</div>
        ) : (
          <>
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {segments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={seg.color.stroke}
                    strokeWidth="16"
                    strokeDasharray="251.2"
                    strokeDashoffset={seg.dashoffset}
                    transform={`rotate(${seg.rotation + 90} 50 50)`}
                    className={`transition-all duration-300 ease-out cursor-pointer ${hoveredCat && hoveredCat !== seg.category ? 'opacity-30' : 'opacity-100 hover:stroke-[20px]'}`}
                    onMouseEnter={() => setHoveredCat(seg.category)}
                    onMouseLeave={() => setHoveredCat(null)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[0.6rem] font-bold text-slate-400">{totalLabel}</span>
                <span className="text-[#0B1E40] font-black text-[1rem] sm:text-[1.1rem]">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-[60%] sm:w-[65%] shrink-0">
              {legend.map((seg, i) => {
                const iconStr = getRelatableIcon(seg.category);
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-3 group cursor-default transition-all duration-300 relative ${hoveredCat === seg.category ? 'sm:translate-x-3 bg-slate-50 p-2 -mx-2 rounded-xl shadow-sm' : ''}`}
                    onMouseEnter={() => setHoveredCat(seg.category)}
                    onMouseLeave={() => setHoveredCat(null)}
                  >
                    {hoveredCat === seg.category && (
                      <div className="absolute -left-5 top-1/2 -translate-y-1/2 animate-pulse">
                        <i className={`ph-fill ph-caret-right ${seg.color.text} text-lg`}></i>
                      </div>
                    )}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl ${seg.color.bg} ${seg.color.text} flex items-center justify-center shrink-0 border border-transparent group-hover:scale-110 transition-all`}>
                        <i className={`ph-bold ${iconStr} text-xl`}></i>
                      </div>
                      <span className="text-[0.8rem] font-bold text-[#0B1E40] truncate">{seg.category}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                      <span className="text-[0.8rem] font-bold text-[#0B1E40]">₹{formatAmount(seg.amount)}</span>
                      <span className="text-[0.7rem] text-slate-400 font-bold w-8 text-right">{formatPct(seg.pct)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      {footer}
    </div>
  );
}
