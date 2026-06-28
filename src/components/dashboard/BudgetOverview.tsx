"use client";
import React, { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BudgetOverview() {
  const { data, isLoading } = useSWR('/api/budget/overview', fetcher);
  const [isExpanded, setIsExpanded] = useState(false);

  const overview = data?.overview || [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-10 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (overview.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <i className="ph-bold ph-chart-donut text-orange-600 text-lg"></i>
          </div>
          <h3 className="font-bold text-slate-800 text-[0.95rem]">Monthly Budget Overview</h3>
        </div>
        <i className={`ph-bold ph-caret-down text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-50 flex flex-col gap-4">
          {overview.map((item: any, idx: number) => {
            const isRed = item.status === "exceeded";
            const isOrange = item.status === "warning";
            const barColor = isRed ? "bg-red-500" : isOrange ? "bg-orange-500" : "bg-emerald-500";
            const bgColor = isRed ? "bg-red-50" : isOrange ? "bg-orange-50" : "bg-emerald-50";

            return (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-slate-700">{item.category}</span>
                  <span className="text-slate-900">
                    ₹{item.spent.toLocaleString()} <span className="text-slate-400 font-medium">/ ₹{item.limit.toLocaleString()}</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                {isRed && (
                  <p className="text-[0.7rem] font-bold text-red-500 mt-0.5 text-right">
                    Over by ₹{(item.spent - item.limit).toLocaleString()}
                  </p>
                )}
                {!isRed && item.limit - item.spent > 0 && (
                  <p className="text-[0.7rem] font-bold text-slate-400 mt-0.5 text-right">
                    ₹{(item.limit - item.spent).toLocaleString()} left
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
