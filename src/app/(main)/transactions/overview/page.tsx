"use client";

import React, { useState } from "react";
import useSWR from "swr";
import Link from "next/link";

const categoryColors: Record<string, { bg: string, stroke: string }> = {
  "Photography Session": { bg: "bg-emerald-500", stroke: "#10b981" },
  "Equipment":           { bg: "bg-amber-500",   stroke: "#f59e0b" },
  "Utilities":           { bg: "bg-slate-700",   stroke: "#334155" },
  "Rent":                { bg: "bg-slate-900",   stroke: "#0f172a" },
  "Software":            { bg: "bg-violet-500",  stroke: "#8b5cf6" },
  "Travel":              { bg: "bg-sky-500",     stroke: "#0ea5e9" },
  "Marketing":           { bg: "bg-rose-500",    stroke: "#f43f5e" },
  "Misc":                { bg: "bg-slate-300",   stroke: "#cbd5e1" },
  "Booking Advance":     { bg: "bg-blue-500",    stroke: "#3b82f6" },
  "Passport Photo":      { bg: "bg-pink-500",    stroke: "#ec4899" },
  "Frame Sales":         { bg: "bg-orange-500",  stroke: "#f97316" },
  "Editing Charges":     { bg: "bg-amber-700",   stroke: "#b45309" },
  "Album Payment":       { bg: "bg-violet-500",  stroke: "#8b5cf6" },
  "Tea & Snacks":        { bg: "bg-sky-500",     stroke: "#0ea5e9" },
  "Fuel":                { bg: "bg-red-500",     stroke: "#ef4444" },
  "Bus Fare":            { bg: "bg-indigo-500",  stroke: "#6366f1" },
  "System Repair":       { bg: "bg-purple-500",  stroke: "#a855f7" },
  "Printing":            { bg: "bg-emerald-500", stroke: "#10b981" },
  "Courier":             { bg: "bg-orange-500",  stroke: "#f97316" },
  "Other Expense":       { bg: "bg-slate-400",   stroke: "#94a3b8" }
};

const CATEGORY_ICONS: Record<string, string> = {
  "Photography Session": "ph-camera",
  "Equipment": "ph-wrench",
  "Utilities": "ph-lightning",
  "Rent": "ph-house",
  "Software": "ph-code",
  "Travel": "ph-airplane",
  "Marketing": "ph-megaphone",
  "Misc": "ph-dots-three-circle",
  "Booking Advance": "ph-calendar-check",
  "Passport Photo": "ph-user",
  "Frame Sales": "ph-frame-corners",
  "Editing Charges": "ph-pencil-circle",
  "Album Payment": "ph-book-open",
  "Tea & Snacks": "ph-coffee",
  "Fuel": "ph-gas-pump",
  "Bus Fare": "ph-bus",
  "System Repair": "ph-wrench",
  "Printing": "ph-printer",
  "Courier": "ph-package",
  "Other Expense": "ph-dots-three-circle"
};

const MODE_ICONS: Record<string, string> = {
  "UPI": "ph-qr-code",
  "Cash": "ph-money",
  "Bank Transfer": "ph-bank",
  "Card": "ph-credit-card",
};

const defaultColor = { bg: "bg-slate-400", stroke: "#94a3b8" };const fetcher = (url: string) => fetch(url).then(res => res.json());

const getRelatableIcon = (cat: string) => {
  const lowerCat = cat.toLowerCase();
  if (lowerCat.includes('photo') || lowerCat === 'pp') return 'ph-camera';
  if (lowerCat.includes('xerox') || lowerCat.includes('print')) return 'ph-printer';
  if (lowerCat.includes('bus') || lowerCat.includes('travel') || lowerCat.includes('fare') || lowerCat.includes('transport')) return 'ph-bus';
  if (lowerCat.includes('salary') || lowerCat.includes('pay') || lowerCat.includes('wage')) return 'ph-money';
  if (lowerCat.includes('tea') || lowerCat.includes('snack') || lowerCat.includes('food') || lowerCat.includes('coffee')) return 'ph-coffee';
  if (lowerCat.includes('chit') || lowerCat.includes('fund') || lowerCat.includes('invest') || lowerCat.includes('save') || lowerCat.includes('bank')) return 'ph-piggy-bank';
  if (lowerCat.includes('sevai') || lowerCat.includes('service') || lowerCat.includes('online') || lowerCat.includes('bill') || lowerCat.includes('tax')) return 'ph-desktop';
  if (lowerCat.includes('equip') || lowerCat.includes('tool') || lowerCat.includes('repair') || lowerCat.includes('maint')) return 'ph-wrench';
  if (lowerCat.includes('rent') || lowerCat.includes('office') || lowerCat.includes('shop') || lowerCat.includes('room')) return 'ph-house';
  if (lowerCat.includes('fuel') || lowerCat.includes('gas') || lowerCat.includes('petrol') || lowerCat.includes('diesel')) return 'ph-gas-pump';
  if (lowerCat.includes('courier') || lowerCat.includes('post') || lowerCat.includes('delivery')) return 'ph-package';
  if (lowerCat.includes('market') || lowerCat.includes('ad')) return 'ph-megaphone';
  if (lowerCat.includes('book') || lowerCat.includes('advance')) return 'ph-calendar-check';
  if (lowerCat.includes('album') || lowerCat.includes('frame')) return 'ph-book-open';
  if (lowerCat.includes('other') || lowerCat.includes('misc')) return 'ph-dots-three-circle';
  return 'ph-tag';
};

const getConsistentColorClasses = (cat: string, predefinedColorName?: string) => {
  const colorMap: Record<string, { bg: string, text: string, stroke: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', stroke: '#34d399' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', stroke: '#fbbf24' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', stroke: '#94a3b8' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', stroke: '#a78bfa' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', stroke: '#38bdf8' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', stroke: '#fb7185' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', stroke: '#60a5fa' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', stroke: '#f472b6' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', stroke: '#fb923c' },
    red: { bg: 'bg-red-50', text: 'text-red-600', stroke: '#f87171' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', stroke: '#818cf8' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', stroke: '#c084fc' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', stroke: '#2dd4bf' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', stroke: '#22d3ee' },
    fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', stroke: '#e879f9' }
  };
  
  if (predefinedColorName && colorMap[predefinedColorName]) {
    return colorMap[predefinedColorName];
  }
  
  const colorValues = Object.values(colorMap).filter(c => c.text !== 'text-slate-600');
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorValues[Math.abs(hash) % colorValues.length];
};

export default function OverviewPage() {
  const [hoveredIncCat, setHoveredIncCat] = useState<string | null>(null);
  const [hoveredExpCat, setHoveredExpCat] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR('/api/transactions/overview', fetcher);
  const { data: layoutRes } = useSWR('/api/settings/layouts/TRANSACTION_FORM', fetcher);

  if (isLoading || !data) {
    return <div className="flex justify-center items-center h-64"><div className="animate-pulse w-8 h-8 rounded-full bg-orange-500"></div></div>;
  }

  const { 
    totalIncome = 0, 
    totalExpenses = 0, 
    expensesByCategory = {}, 
    recentTransactions: transactions = [],
    todayTransactions = [],
    todayIncome = 0,
    todayExpense = 0,
    todayNet = 0
  } = data;
  
  const netSurplus = totalIncome - totalExpenses;
  const today = new Date();

  // --- Dynamic Heatmap Logic ---
  const heatmapData = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({ category, amount: amount as number, pct: totalExpenses > 0 ? (amount as number) / totalExpenses : 0 }))
    .sort((a, b) => b.amount - a.amount);

  let cumulativePct = 0;
  const donutSegments = heatmapData.map((data: any, idx: number) => {
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
  
  transactions.filter((t: any) => t.type === 'INCOME').forEach((t: any) => {
    const d = new Date(t.date);
    let day = d.getDay() - 1; // 0=Mon, -1=Sun
    if (day === -1) day = 6; 
    actualFlow[day] += t.amount;
  });

  const maxFlow = Math.max(...actualFlow, 1000); 

  // --- Today Breakdown Logic ---
  const todayIncomeByCategory = todayTransactions.filter((t:any) => t.type === 'INCOME').reduce((acc: any, t: any) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const todayExpensesByCategory = todayTransactions.filter((t:any) => t.type === 'EXPENSE').reduce((acc: any, t: any) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const sortedTodayIncome = Object.entries(todayIncomeByCategory).map(([cat, amt]) => ({ category: cat, amount: amt as number, pct: todayIncome > 0 ? (amt as number) / todayIncome : 0 })).sort((a, b) => b.amount - a.amount);
  const sortedTodayExpenses = Object.entries(todayExpensesByCategory).map(([cat, amt]) => ({ category: cat, amount: amt as number, pct: todayExpense > 0 ? (amt as number) / todayExpense : 0 })).sort((a, b) => b.amount - a.amount);

  let curIncPct = 0;
  const todayIncomeSegments = sortedTodayIncome.map((data: any) => {
    const dasharray = 251.2; // 2 * pi * r (r=40)
    const dashoffset = dasharray - (data.pct * dasharray);
    const rotation = curIncPct * 360 - 90; // Start from top
    curIncPct += data.pct;
    return { ...data, dashoffset, rotation, color: getConsistentColorClasses(data.category) };
  });

  let curExpPct = 0;
  const todayExpenseSegments = sortedTodayExpenses.map((data: any) => {
    const dasharray = 251.2; // 2 * pi * r (r=40)
    const dashoffset = dasharray - (data.pct * dasharray);
    const rotation = curExpPct * 360 - 90; // Start from top
    curExpPct += data.pct;
    return { ...data, dashoffset, rotation, color: getConsistentColorClasses(data.category) };
  });

  const layoutSchema = layoutRes?.schema;
  let dynamicCategories: string[] = [];
  if (layoutSchema?.sections) {
    for (const sec of layoutSchema.sections) {
      for (const f of sec.fields) {
        if (f.id === "fld_tx_category" && f.options) {
          dynamicCategories = f.options;
        }
      }
    }
  }

  const baseCategories = dynamicCategories.length > 0 ? dynamicCategories : Object.keys(CATEGORY_ICONS);

  const getConsistentColorClassesLocal = (cat: string) => {
    // Left empty since it's now outside, but leaving this space to safely replace
  };

  const allCategoriesList = baseCategories.map(cat => {
    const isIncome = ["Photography Session", "Booking Advance", "Passport Photo", "Frame Sales", "Editing Charges", "Album Payment", "PP", "Xerox", "Printout", "E-Sevai", "Others"].includes(cat);
    
    const definedBg = categoryColors[cat]?.bg;
    const colorName = definedBg ? definedBg.split('-')[1] : undefined;
    const classes = getConsistentColorClasses(cat, colorName);
    
    return {
      label: cat,
      icon: CATEGORY_ICONS[cat] || getRelatableIcon(cat),
      color: classes.text,
      bg: classes.bg,
      type: isIncome ? "INCOME" : "EXPENSE"
    };
  });


  return (
    <div className="animate-fade-in w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Today's Income */}
        <Link href="/transactions/allTransactions?view=day&type=INCOME" className="block outline-none">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px] animate-slide-up hover:shadow-md hover:-translate-y-1 hover:border-orange-200 transition-all relative overflow-hidden" style={{ animationDelay: "100ms" }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Today's Income</span>
              <span className="text-[0.65rem] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                <i className="ph-bold ph-trend-up"></i>
              </span>
            </div>
            <div>
              <div className="text-[1.4rem] font-extrabold text-slate-900 mb-0.5">₹{todayIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-[0.65rem] text-slate-500 font-medium">Today</div>
            </div>
            <div className="w-full bg-slate-100 h-[3px] mt-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[100%] rounded-full"></div>
            </div>
          </div>
        </Link>

        {/* Today's Expenses */}
        <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="block outline-none">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px] animate-slide-up hover:shadow-md hover:-translate-y-1 hover:border-orange-200 transition-all relative overflow-hidden" style={{ animationDelay: "150ms" }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Today's Expenses</span>
              <span className="text-[0.65rem] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                <i className="ph-bold ph-trend-down"></i>
              </span>
            </div>
            <div>
              <div className="text-[1.4rem] font-extrabold text-slate-900 mb-0.5">₹{todayExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-[0.65rem] text-slate-500 font-medium">Today</div>
            </div>
            <div className="w-full bg-slate-100 h-[3px] mt-2 rounded-full overflow-hidden flex gap-1">
              <div className="bg-rose-500 h-full w-[100%] rounded-full"></div>
            </div>
          </div>
        </Link>

        {/* Net Today */}
        <Link href="/transactions/allTransactions?view=day" className="block outline-none">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-[120px] animate-slide-up hover:shadow-md hover:-translate-y-1 hover:border-orange-200 transition-all relative overflow-hidden" style={{ animationDelay: "200ms" }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Net Today</span>
              <span className={`text-[0.6rem] font-extrabold px-2 py-0.5 rounded tracking-wider ${todayNet >= 0 ? 'text-indigo-700 bg-indigo-50' : 'text-rose-700 bg-rose-50'}`}>
                {todayNet >= 0 ? 'HEALTHY' : 'DEFICIT'}
              </span>
            </div>
            <div>
              <div className="text-[1.4rem] font-extrabold text-slate-900 mb-0.5">₹{todayNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-[0.65rem] text-slate-500 font-medium">Today</div>
            </div>
            <div className="w-full bg-slate-100 h-[3px] mt-2 rounded-full overflow-hidden flex">
              <div className={`h-full w-[100%] rounded-full ${todayNet >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
            </div>
          </div>
        </Link>

        {/* Top Expense */}
        <Link href={`/transactions/allTransactions?categories=${highestExpenseCategory ? encodeURIComponent(highestExpenseCategory.category) : ''}`} className="block outline-none">
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
        </Link>
      </div>

      {/* Row 2: Income & Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-start">
          {/* Card 1: Income Sources */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="p-5 pb-2">
              <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Income Sources (Today)</h3>
            </div>
            <div className="flex-1 p-5 flex flex-col md:flex-row items-center gap-6">
              {todayIncome === 0 ? (
                 <div className="w-full text-center text-slate-400 py-10 text-sm">No income recorded today</div>
              ) : (
              <>
              <div className="relative w-32 h-32 shrink-0">
                 <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                   {todayIncomeSegments.map((seg, i) => (
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
                       className={`transition-all duration-300 ease-out cursor-pointer ${hoveredIncCat && hoveredIncCat !== seg.category ? 'opacity-30' : 'opacity-100 hover:stroke-[20px]'}`}
                       onMouseEnter={() => setHoveredIncCat(seg.category)}
                       onMouseLeave={() => setHoveredIncCat(null)}
                     />
                   ))}
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-[0.6rem] font-bold text-slate-400">Total Income</span>
                   <span className="text-[#0B1E40] font-black text-[1.1rem]">₹{todayIncome.toLocaleString('en-IN')}</span>
                 </div>
              </div>
              <div className="flex-1 flex flex-col gap-3 w-full">
                 {todayIncomeSegments.map((seg, i) => {
                   const iconStr = getRelatableIcon(seg.category);
                   return (
                   <div 
                     key={i} 
                     className={`flex items-center justify-between group cursor-default transition-all duration-300 relative ${hoveredIncCat === seg.category ? 'translate-x-3 bg-slate-50 p-2 -mx-2 rounded-xl shadow-sm' : ''}`}
                     onMouseEnter={() => setHoveredIncCat(seg.category)}
                     onMouseLeave={() => setHoveredIncCat(null)}
                   >
                     {hoveredIncCat === seg.category && (
                       <div className="absolute -left-5 top-1/2 -translate-y-1/2 animate-pulse">
                         <i className={`ph-fill ph-caret-right ${seg.color.text} text-lg`}></i>
                       </div>
                     )}
                     <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-xl ${seg.color.bg} ${seg.color.text} flex items-center justify-center shrink-0 border border-transparent group-hover:scale-110 transition-all`}>
                         <i className={`ph-bold ${iconStr} text-xl`}></i>
                       </div>
                       <span className="text-[0.8rem] font-bold text-[#0B1E40]">{seg.category}</span>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="text-[0.8rem] font-bold text-[#0B1E40]">₹{seg.amount.toLocaleString('en-IN')}</span>
                       <span className="text-[0.7rem] text-slate-400 font-bold w-8 text-right">{Math.round(seg.pct * 100)}%</span>
                     </div>
                   </div>
                 )})}
              </div>
              </>
              )}
            </div>
            <div className="border-t border-slate-100 p-3 flex justify-end mt-auto">
               <Link href="/transactions/allTransactions?view=day&type=INCOME" className="text-blue-600 font-bold text-[0.8rem] hover:text-blue-700 flex items-center gap-1 px-2">
                  View all income <i className="ph-bold ph-arrow-right"></i>
               </Link>
            </div>
          </div>

          {/* Card 2: Expense Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay: "400ms" }}>
            <div className="p-5 pb-2 flex justify-between items-start">
              <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Expense Breakdown (Today)</h3>
            </div>
            <div className="flex-1 p-5 flex flex-col md:flex-row items-center gap-6">
               {todayExpense === 0 ? (
                 <div className="w-full text-center text-slate-400 py-10 text-sm">No expenses recorded today</div>
               ) : (
               <>
               <div className="relative w-32 h-32 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {todayExpenseSegments.map((seg, i) => (
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
                        className={`transition-all duration-300 ease-out cursor-pointer ${hoveredExpCat && hoveredExpCat !== seg.category ? 'opacity-30' : 'opacity-100 hover:stroke-[20px]'}`}
                        onMouseEnter={() => setHoveredExpCat(seg.category)}
                        onMouseLeave={() => setHoveredExpCat(null)}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[0.6rem] font-bold text-slate-400">Total Expense</span>
                    <span className="text-[#0B1E40] font-black text-[1.1rem]">₹{todayExpense.toLocaleString('en-IN')}</span>
                  </div>
               </div>
               <div className="flex-1 flex flex-col gap-3 w-full">
                 {sortedTodayExpenses.slice(0, 4).map((seg: any, i: number) => {
                   const iconStr = getRelatableIcon(seg.category);
                   const colorClass = getConsistentColorClasses(seg.category);
                   return (
                   <div 
                     key={i} 
                     className={`flex items-center justify-between group cursor-default transition-all duration-300 relative ${hoveredExpCat === seg.category ? 'translate-x-3 bg-slate-50 p-2 -mx-2 rounded-xl shadow-sm' : ''}`}
                     onMouseEnter={() => setHoveredExpCat(seg.category)}
                     onMouseLeave={() => setHoveredExpCat(null)}
                   >
                     {hoveredExpCat === seg.category && (
                       <div className="absolute -left-5 top-1/2 -translate-y-1/2 animate-pulse">
                         <i className={`ph-fill ph-caret-right ${colorClass.text} text-lg`}></i>
                       </div>
                     )}
                     <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-xl ${colorClass.bg} ${colorClass.text} flex items-center justify-center shrink-0 border border-transparent group-hover:scale-110 transition-all`}>
                         <i className={`ph-bold ${iconStr} text-xl`}></i>
                       </div>
                       <span className="text-[0.8rem] font-bold text-[#0B1E40]">{seg.category}</span>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="text-[0.8rem] font-bold text-[#0B1E40]">₹{seg.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                       <span className="text-[0.7rem] text-slate-400 font-bold w-8 text-right">{(seg.pct * 100).toFixed(1)}%</span>
                     </div>
                   </div>
                 )})}
               </div>
               </>
               )}
            </div>
            <div className="border-t border-slate-100 p-3 flex justify-start mt-auto">
               <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="text-orange-500 font-bold text-[0.8rem] hover:text-orange-600 flex items-center gap-1 px-2">
                  View all expenses <i className="ph-bold ph-arrow-right"></i>
               </Link>
            </div>
          </div>
      </div>

      {/* Quick Add Transaction */}
      <div className="bg-white rounded-[20px] py-4 px-4 md:px-6 shadow-sm border border-slate-100 mb-8 animate-slide-up flex flex-col justify-center w-fit mx-auto max-w-full" style={{ animationDelay: "350ms" }}>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide snap-x justify-start w-full mx-auto">
          {allCategoriesList.map((qa, i) => (
            <Link key={i} href={`/transactions/new?category=${encodeURIComponent(qa.label)}&type=${qa.type}`} className="flex flex-col items-center gap-2 outline-none group shrink-0 w-[65px] sm:w-[75px] snap-start">
              <div className={`w-12 h-12 rounded-[14px] ${qa.bg} ${qa.color} flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
                <i className={`ph-bold ${qa.icon} text-xl`}></i>
              </div>
              <span className="text-[0.65rem] font-bold text-[#0B1E40] leading-tight text-center">
                {qa.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl mb-8 transition-transform duration-300 hover:-translate-y-1 group">
        {/* Animated Glow Orbs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-orange-500 rounded-full blur-[120px] opacity-15 group-hover:opacity-25 transition-opacity duration-700" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-500 rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500 rounded-full blur-[160px] opacity-[0.04]" />

        {/* Header Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 sm:px-8 pt-5 sm:pt-7 pb-0 gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <i className="ph-bold ph-receipt text-white text-lg" />
            </div>
            <div>
              <h3 className="text-white text-[1rem] sm:text-[1.15rem] font-extrabold tracking-tight leading-tight">Today's Transactions</h3>
              <p className="text-slate-400 text-[0.65rem] sm:text-[0.7rem] font-semibold tracking-wide uppercase">{today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 px-5 sm:px-8 py-5">
          <Link href="/transactions/allTransactions?view=day&type=INCOME" className="block outline-none">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <i className="ph-bold ph-arrow-down-left text-emerald-400 text-xs" />
                </div>
                <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Income</span>
              </div>
              <span className="text-white text-[1.5rem] font-extrabold tracking-tight">₹{todayIncome.toLocaleString('en-IN')}</span>
            </div>
          </Link>
          <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="block outline-none">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <i className="ph-bold ph-arrow-up-right text-red-400 text-xs" />
                </div>
                <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Expense</span>
              </div>
              <span className="text-white text-[1.5rem] font-extrabold tracking-tight">₹{todayExpense.toLocaleString('en-IN')}</span>
            </div>
          </Link>
          <Link href="/transactions/allTransactions?view=day" className="block outline-none">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-lg ${todayNet >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                  <i className={`ph-bold ${todayNet >= 0 ? 'ph-trend-up text-emerald-400' : 'ph-trend-down text-red-400'} text-xs`} />
                </div>
                <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Net Today</span>
              </div>
              <span className={`text-[1.5rem] font-extrabold tracking-tight ${todayNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {todayNet >= 0 ? '+' : ''}₹{todayNet.toLocaleString('en-IN')}
              </span>
            </div>
          </Link>
        </div>

        {/* Transaction List */}
        <div className="relative z-10 px-5 sm:px-8 pb-5 sm:pb-7">
          {todayTransactions.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm border border-dashed border-white/10 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <i className="ph ph-receipt text-3xl text-slate-500" />
              </div>
              <p className="text-slate-400 font-semibold text-sm">No transactions recorded today</p>
              <p className="text-slate-500 text-xs mt-1">Add your first transaction to see it here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1 sm:pr-2">
              {todayTransactions.map((txn: any, idx: number) => (
                <div
                  key={txn.id}
                  className="group/item flex flex-col sm:flex-row sm:items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-sm rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 border border-white/[0.06] hover:border-white/15 transition-all duration-200 cursor-pointer gap-2 sm:gap-0"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg ${
                      txn.type === 'INCOME'
                        ? 'bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 text-emerald-400 shadow-emerald-500/10'
                        : 'bg-gradient-to-br from-red-400/20 to-red-600/20 text-red-400 shadow-red-500/10'
                    }`}>
                      <i className={`ph-fill ${CATEGORY_ICONS[txn.category] || 'ph-dots-three-circle'}`} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-[0.9rem] leading-tight">{txn.category}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[0.55rem] font-extrabold uppercase tracking-[0.5px] ${
                          txn.type === 'INCOME'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}>{txn.type}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {txn.description && (
                          <span className="text-slate-500 text-[0.75rem] font-medium truncate max-w-[200px]">{txn.description}</span>
                        )}
                        <span className="text-slate-600 text-[0.65rem] flex items-center gap-1">
                          <i className={`ph-fill ${MODE_ICONS[txn.paymentMode] || 'ph-wallet'} text-[0.6rem]`} />
                          {txn.paymentMode}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 border-t border-white/10 sm:border-0 pt-2 sm:pt-0">
                    <span className="text-slate-500 text-[0.7rem] font-semibold">
                      {new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                    <span className={`text-[1.05rem] font-extrabold tracking-tight ${
                      txn.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {txn.type === 'INCOME' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                {totalExpenses > 0 ? donutSegments.map((seg: any, i: number) => (
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
              {donutSegments.map((seg: any) => (
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
      
      {/* Tax Efficiency Tip */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gradient-to-br from-slate-100 to-orange-100/50 rounded-3xl p-8 shadow-sm border border-orange-100 flex flex-col items-center justify-center text-center animate-slide-up relative overflow-hidden" style={{ animationDelay: "450ms" }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-3xl rounded-full"></div>
          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-orange-600 mb-4 z-10 border border-orange-50 animate-float" style={{ animationDelay: "1s" }}>
            <i className="ph-fill ph-lightbulb text-2xl"></i>
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg mb-2 z-10">Smart Insight</h3>
          <p className="text-xs text-slate-600 leading-relaxed z-10 max-w-[600px]">
            {highestExpenseCategory 
              ? `Your largest expense is ${highestExpenseCategory.category} (${Math.round(highestExpenseCategory.pct * 100)}%). Make sure you log all receipts for tax deductions.`
              : `Start adding your expenses to unlock AI-driven tax and saving insights.`}
          </p>
        </div>
      </div>

    </div>
  );
}
