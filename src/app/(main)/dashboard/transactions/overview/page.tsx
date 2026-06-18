"use client";

import React, { useState, useEffect } from "react";
import { TRANSACTION_CATEGORIES } from "@/lib/transactionConstants";

const categoryColors: Record<string, { bg: string, stroke: string }> = {
  "Photography Session": { bg: "bg-emerald-500", stroke: "#10b981" },
  "Equipment":           { bg: "bg-amber-500",   stroke: "#f59e0b" },
  "Utilities":           { bg: "bg-slate-700",   stroke: "#334155" },
  "Rent":                { bg: "bg-slate-900",   stroke: "#0f172a" },
  "Software":            { bg: "bg-violet-500",  stroke: "#8b5cf6" },
  "Travel":              { bg: "bg-sky-500",     stroke: "#0ea5e9" },
  "Marketing":           { bg: "bg-rose-500",    stroke: "#f43f5e" },
  "Misc":                { bg: "bg-slate-300",   stroke: "#cbd5e1" }
};

const defaultColor = { bg: "bg-slate-400", stroke: "#94a3b8" };

export default function OverviewPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // The overview always needs all records for aggregation — cursor-walk all pages
      let all: any[] = [];
      let cursor: string | null = null;
      do {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        const res = await fetch(`/api/transactions?${params.toString()}`);
        if (!res.ok) break;
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items ?? []);
        all = [...all, ...items];
        cursor = Array.isArray(data) ? null : (data.nextCursor ?? null);
      } while (cursor);
      setTransactions(all);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const netSurplus = totalIncome - totalExpenses;

  // --- Dynamic Heatmap Logic ---
  const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
  const expensesByCategory = expenseTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const heatmapData = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount: amount as number, pct: totalExpenses > 0 ? (amount as number) / totalExpenses : 0 }))
    .sort((a, b) => b.amount - a.amount);

  let cumulativePct = 0;
  const donutSegments = heatmapData.map((data, idx) => {
    const dasharray = 251.2;
    const dashoffset = dasharray - (data.pct * dasharray);
    const rotation = cumulativePct * 360;
    cumulativePct += data.pct;
    return { ...data, dashoffset, rotation, color: categoryColors[data.category] || defaultColor };
  });

  const highestExpenseCategory = donutSegments.length > 0 ? donutSegments[0] : null;

  // --- Dynamic Weekly Flow Logic ---
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const actualFlow = new Array(7).fill(0);
  
  transactions.filter(t => t.type === 'INCOME').forEach(t => {
    const d = new Date(t.date);
    let day = d.getDay() - 1; // 0=Mon, -1=Sun
    if (day === -1) day = 6; 
    actualFlow[day] += t.amount;
  });

  const maxFlow = Math.max(...actualFlow, 1000); 

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-pulse w-8 h-8 rounded-full bg-orange-500"></div></div>;
  }

  return (
    <div className="animate-fade-in w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Income */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px] animate-slide-up hover:shadow-md hover:-translate-y-1 hover:border-orange-200 transition-all relative overflow-hidden" style={{ animationDelay: "100ms" }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Total Income</span>
            <span className="text-[0.65rem] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
              <i className="ph-bold ph-trend-up"></i>
            </span>
          </div>
          <div>
            <div className="text-[1.4rem] font-extrabold text-slate-900 mb-0.5">₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[0.65rem] text-slate-500 font-medium">All Time</div>
          </div>
          <div className="w-full bg-slate-100 h-[3px] mt-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[100%] rounded-full"></div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px] animate-slide-up hover:shadow-md hover:-translate-y-1 hover:border-orange-200 transition-all relative overflow-hidden" style={{ animationDelay: "150ms" }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <span className="text-[0.65rem] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
              <i className="ph-bold ph-trend-down"></i>
            </span>
          </div>
          <div>
            <div className="text-[1.4rem] font-extrabold text-slate-900 mb-0.5">₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[0.65rem] text-slate-500 font-medium">All Time</div>
          </div>
          <div className="w-full bg-slate-100 h-[3px] mt-2 rounded-full overflow-hidden flex gap-1">
            <div className="bg-rose-500 h-full w-[100%] rounded-full"></div>
          </div>
        </div>

        {/* Net Surplus */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px] animate-slide-up hover:shadow-md hover:-translate-y-1 hover:border-orange-200 transition-all relative overflow-hidden" style={{ animationDelay: "200ms" }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Net Surplus</span>
            <span className={`text-[0.6rem] font-extrabold px-2 py-0.5 rounded tracking-wider ${netSurplus >= 0 ? 'text-indigo-700 bg-indigo-50' : 'text-rose-700 bg-rose-50'}`}>
              {netSurplus >= 0 ? 'HEALTHY' : 'DEFICIT'}
            </span>
          </div>
          <div>
            <div className="text-[1.4rem] font-extrabold text-slate-900 mb-0.5">₹{netSurplus.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[0.65rem] text-slate-500 font-medium">All Time</div>
          </div>
          <div className="w-full bg-slate-100 h-[3px] mt-2 rounded-full overflow-hidden flex">
            <div className={`h-full w-[100%] rounded-full ${netSurplus >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
          </div>
        </div>

        {/* Velocity */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center h-[120px] animate-slide-up hover:shadow-md hover:-translate-y-1 hover:border-orange-200 transition-all relative overflow-hidden text-center" style={{ animationDelay: "250ms" }}>
          <div className="relative w-16 h-8 mb-1.5">
             <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
               <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round" />
               <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={highestExpenseCategory ? highestExpenseCategory.color.stroke : "#f97316"} strokeWidth="12" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={highestExpenseCategory ? 125.6 - (highestExpenseCategory.pct * 125.6) : 125.6} className="animate-dash" style={{ animationDelay: '500ms' }} />
             </svg>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 font-extrabold text-[0.75rem] text-slate-900">
               {highestExpenseCategory ? Math.round(highestExpenseCategory.pct * 100) : 0}%
             </div>
          </div>
          <span className="text-[0.65rem] font-bold text-slate-900 uppercase tracking-widest mb-0.5">Top Expense</span>
          <p className="text-[0.55rem] text-slate-500 leading-tight truncate w-full px-2">
            {highestExpenseCategory ? highestExpenseCategory.category : 'No expenses'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Expense Heatmap */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col animate-slide-up" style={{ animationDelay: "350ms" }}>
          <h2 className="text-lg font-bold text-slate-900 mb-8">Expense Heatmap</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* SVG Donut */}
            <div className="relative w-48 h-48 mb-8 animate-float">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 overflow-visible">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {totalExpenses > 0 ? donutSegments.map((seg, i) => (
                  <circle 
                    key={seg.category}
                    cx="50" cy="50" r="40" fill="none" 
                    stroke={seg.color.stroke} strokeWidth="12" 
                    strokeDasharray="251.2" strokeDashoffset={seg.dashoffset} 
                    transform={`rotate(${seg.rotation} 50 50)`} 
                    className="animate-dash" style={{ animationDelay: `${600 + (i*100)}ms` }} 
                  />
                )) : null}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Total</span>
                <span className="text-2xl font-extrabold text-slate-900">₹{(totalExpenses/1000).toFixed(1)}k</span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full grid grid-cols-2 gap-y-4 gap-x-2 px-2 max-h-[100px] overflow-y-auto">
              {donutSegments.map(seg => (
                <div key={seg.category} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${seg.color.bg}`}></div>
                  <span className="text-[11px] font-medium text-slate-600 truncate">{seg.category} ({Math.round(seg.pct * 100)}%)</span>
                </div>
              ))}
              {donutSegments.length === 0 && (
                 <span className="text-xs text-slate-400 col-span-2 text-center">No expenses recorded.</span>
              )}
            </div>
          </div>
        </div>

        {/* Actual vs Projected Flow */}
        <div className="bg-[#fdfaf6] rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col animate-slide-up" style={{ animationDelay: "400ms" }}>
          <div className="flex justify-between items-start mb-12">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Income Flow by Day</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aggregated for selected period</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-orange-500"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Income</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-end justify-between px-4 pt-10 h-[180px] gap-2">
            {dayLabels.map((day, idx) => {
               const val = actualFlow[idx];
               const heightPct = maxFlow > 0 ? (val / maxFlow) * 80 + 5 : 5; // min 5% height
               const isMax = val === Math.max(...actualFlow) && val > 0;
               return (
                 <div key={day} className="flex items-end gap-1 w-full h-full justify-center group relative">
                   <div 
                     className={`w-10 rounded-t-sm transition-all animate-slide-up ${isMax ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] z-10' : 'bg-orange-200 group-hover:bg-orange-300'}`}
                     style={{ height: `${heightPct}%`, animationDelay: `${500 + (idx*50)}ms` }}
                   ></div>
                   {isMax && <div className="absolute -bottom-8 font-extrabold text-slate-900 text-xs">{day}</div>}
                 </div>
               )
            })}
          </div>
          <div className="flex justify-between px-6 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {dayLabels.map((day, idx) => {
               const val = actualFlow[idx];
               const isMax = val === Math.max(...actualFlow) && val > 0;
               return <span key={day} className={isMax ? 'opacity-0' : ''}>{day}</span>
            })}
          </div>
        </div>
      </div>
      
      {/* Tax Efficiency Tip and Today's Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-100 to-orange-100/50 rounded-3xl p-8 shadow-sm border border-orange-100 flex flex-col items-center justify-center text-center animate-slide-up relative overflow-hidden" style={{ animationDelay: "450ms" }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-3xl rounded-full"></div>
          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-orange-600 mb-4 z-10 border border-orange-50 animate-float" style={{ animationDelay: "1s" }}>
            <i className="ph-fill ph-lightbulb text-2xl"></i>
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg mb-2 z-10">Smart Insight</h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-6 z-10 max-w-[400px]">
            {highestExpenseCategory 
              ? `Your largest expense is ${highestExpenseCategory.category} (${Math.round(highestExpenseCategory.pct * 100)}%). Make sure you log all receipts for tax deductions.`
              : `Start adding your expenses to unlock AI-driven tax and saving insights.`}
          </p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 animate-slide-up" style={{ animationDelay: "500ms" }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">Today's Transactions</h2>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-2">
            {transactions.filter(t => new Date(t.date).toDateString() === new Date().toDateString()).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <i className="ph ph-receipt text-3xl mb-2 opacity-50"></i>
                <p className="font-medium text-xs">No transactions recorded today.</p>
              </div>
            ) : (
              transactions.filter(t => new Date(t.date).toDateString() === new Date().toDateString()).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <i className={`ph-bold ${tx.type === 'INCOME' ? 'ph-money' : 'ph-credit-card'} text-lg`}></i>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm mb-0.5">
                        {tx.description ? tx.description.split(' - ')[0] : tx.category}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded tracking-wider uppercase">{tx.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm mb-0.5 ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'EXPENSE' ? '-' : ''}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{tx.paymentMode}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
