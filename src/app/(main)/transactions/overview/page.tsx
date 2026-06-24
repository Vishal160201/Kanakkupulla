"use client";

import React, { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [hoveredIncCat, setHoveredIncCat] = useState<string | null>(null);
  const [hoveredExpCat, setHoveredExpCat] = useState<string | null>(null);
  const [hoveredHeatCat, setHoveredHeatCat] = useState<string | null>(null);
  const [hoveredFlowDay, setHoveredFlowDay] = useState<number | null>(null);
  const [hoveredNetDay, setHoveredNetDay] = useState<number | null>(null);

  const queryStr = React.useMemo(() => {
    const todayDate = new Date();
    const yearStart = new Date(todayDate.getFullYear(), 0, 1);
    return `?startDate=${yearStart.toISOString().split('T')[0]}&endDate=${todayDate.toISOString().split('T')[0]}`;
  }, []);

  const { data, error, isLoading } = useSWR(`/api/transactions/overview${queryStr}`, fetcher);
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
    const definedBg = categoryColors[data.category]?.bg;
    const colorName = definedBg ? definedBg.split('-')[1] : undefined;
    return {
      ...data,
      dasharray,
      dashoffset,
      rotation,
      color: getConsistentColorClasses(data.category, colorName),
      icon: CATEGORY_ICONS[data.category] || getRelatableIcon(data.category),
    };
  });

  const highestExpenseCategory = donutSegments.length > 0 ? donutSegments[0] : null;

  // --- Dynamic Weekly Flow Logic ---
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const actualFlow = new Array(7).fill(0);
  const expenseFlow = new Array(7).fill(0);

  transactions.forEach((t: any) => {
    const d = new Date(t.date);
    let day = d.getDay() - 1; // 0=Mon, -1=Sun
    if (day === -1) day = 6;
    if (t.type === 'INCOME') {
      actualFlow[day] += t.amount;
    } else if (t.type === 'EXPENSE') {
      expenseFlow[day] += t.amount;
    }
  });

  const netFlow = actualFlow.map((income, idx) => income - expenseFlow[idx]);
  const maxFlow = Math.max(...actualFlow, 1);
  const activeFlowDay = hoveredFlowDay ?? actualFlow.indexOf(Math.max(...actualFlow));
  const activeNetDay = hoveredNetDay ?? netFlow.indexOf(Math.max(...netFlow));
  const netValues = netFlow.length > 0 ? netFlow : new Array(7).fill(0);
  const netMin = Math.min(...netValues, 0);
  const netMax = Math.max(...netValues, 0);
  const netRange = Math.max(netMax - netMin, 1);
  const netPoints = netValues.map((value, idx) => {
    const x = 20 + (idx * 240) / 6;
    const y = 20 + ((netMax - value) / netRange) * 65;
    return { x, y, value };
  });
  const netZeroY = 20 + ((netMax - 0) / netRange) * 65;
  const netPath = netPoints.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const netAreaPath = `${netPath} L ${netPoints[netPoints.length - 1]?.x.toFixed(1) ?? 260} ${netZeroY.toFixed(1)} L ${netPoints[0]?.x.toFixed(1) ?? 20} ${netZeroY.toFixed(1)} Z`;

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

  const todayCashNet = todayTransactions.filter((t:any) => t.paymentMode?.toLowerCase() === 'cash').reduce((acc: number, t: any) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
  const todayUpiNet = todayTransactions.filter((t:any) => t.paymentMode?.toLowerCase() === 'upi').reduce((acc: number, t: any) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

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

  const activeHeatSegment = hoveredHeatCat
    ? donutSegments.find((seg: any) => seg.category === hoveredHeatCat)
    : null;


  return (
    <div className="animate-fade-in w-full">
      {/* KPI Cards — Always same row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-5 mb-8">
        {/* Today's Income */}
        <Link href="/transactions/allTransactions?view=day&type=INCOME" className="block outline-none group min-w-0">
          <div className="bg-white rounded-lg sm:rounded-[18px] md:rounded-[22px] p-3 sm:p-4 md:p-5 shadow-sm sm:shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-slate-100/80 flex flex-col justify-between h-[110px] sm:h-[130px] md:h-[150px] animate-slide-up hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-orange-200" style={{ animationDelay: "100ms" }}>
            <div className="flex justify-between items-start gap-1.5 sm:gap-2">
              <div className="min-w-0">
                <span className="text-[0.55rem] sm:text-[0.6rem] md:text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-[1px]">Today's Income</span>
                <div className="text-[0.95rem] sm:text-[1.2rem] md:text-[1.5rem] font-extrabold text-slate-950 mt-1.5 sm:mt-2 md:mt-3 leading-none truncate">₹{todayIncome.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <span className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg text-emerald-600 bg-emerald-50 flex items-center justify-center shrink-0">
                <i className="ph-bold ph-trend-up text-xs sm:text-sm md:text-base"></i>
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="text-[0.65rem] sm:text-[0.75rem] text-slate-500 font-bold">Today</div>
              <svg viewBox="0 0 130 54" className="w-[70px] sm:w-[90px] md:w-[110px] h-[30px] sm:h-[38px] md:h-[46px] overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="incomeSpark" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6ee7d3" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <path d="M4 40 L17 28 L30 29 L43 25 L56 29 L69 19 L82 24 L95 25 L108 15 L126 3" fill="none" stroke="url(#incomeSpark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="100" strokeDasharray="100" strokeDashoffset="100" className="animate-dash" style={{ animationDelay: "450ms" }} />
              </svg>
            </div>
          </div>
        </Link>

        {/* Today's Expenses */}
        <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="block outline-none group min-w-0">
          <div className="bg-white rounded-lg sm:rounded-[18px] md:rounded-[22px] p-3 sm:p-4 md:p-5 shadow-sm sm:shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-slate-100/80 flex flex-col justify-between h-[110px] sm:h-[130px] md:h-[150px] animate-slide-up hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-orange-200" style={{ animationDelay: "150ms" }}>
            <div className="flex justify-between items-start gap-1.5 sm:gap-2">
              <div className="min-w-0">
                <span className="text-[0.55rem] sm:text-[0.6rem] md:text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-[1px]">Today's Expenses</span>
                <div className="text-[0.95rem] sm:text-[1.2rem] md:text-[1.5rem] font-extrabold text-slate-950 mt-1.5 sm:mt-2 md:mt-3 leading-none truncate">₹{todayExpense.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <span className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg text-rose-600 bg-rose-50 flex items-center justify-center shrink-0">
                <i className="ph-bold ph-trend-down text-xs sm:text-sm md:text-base"></i>
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="text-[0.65rem] sm:text-[0.75rem] text-slate-500 font-bold">Today</div>
              <svg viewBox="0 0 130 54" className="w-[70px] sm:w-[90px] md:w-[110px] h-[30px] sm:h-[38px] md:h-[46px] overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="expenseSpark" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <path d="M4 18 L17 15 L30 18 L43 16 L56 23 L69 14 L82 22 L95 18 L108 28 L126 33" fill="none" stroke="url(#expenseSpark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="100" strokeDasharray="100" strokeDashoffset="100" className="animate-dash" style={{ animationDelay: "500ms" }} />
              </svg>
            </div>
          </div>
        </Link>

        {/* Net Today */}
        <Link href="/transactions/allTransactions?view=day" className="block outline-none group min-w-0">
          <div 
            className="rounded-lg sm:rounded-[18px] md:rounded-[22px] p-2.5 sm:p-4 shadow-[0_8px_32px_rgba(15,23,42,0.04)] flex flex-col justify-between h-[110px] sm:h-[130px] md:h-[150px] animate-slide-up transition-all relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-orange-200 group-hover:-translate-y-0.5 group-hover:shadow-md" 
            style={{ 
              animationDelay: "200ms", 
              background: "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,248,255,0.85) 100%)",
              backdropFilter: "blur(12px)",
              boxShadow: "inset 0 0 0 1px rgba(184, 134, 11, 0.25), 0 10px 40px -10px rgba(0,0,0,0.08)"
            }}
          >
            {/* Top Row */}
            <div className="flex justify-between items-start gap-1 relative z-10">
              <span className="text-[0.55rem] sm:text-[0.6rem] md:text-[0.65rem] font-bold text-slate-500 uppercase tracking-[1px]">Net Today</span>
              <div 
                className="px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm border border-white/50"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(220,230,245,0.6) 100%)",
                  boxShadow: "inset 0 1px 1px white, 0 2px 4px rgba(0,0,0,0.05)"
                }}
              >
                <span className={`text-[0.45rem] sm:text-[0.55rem] font-extrabold tracking-[0.8px] drop-shadow-sm ${todayNet >= 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                  {todayNet >= 0 ? 'HEALTHY' : 'DEFICIT'}
                </span>
              </div>
            </div>

            {/* Main Value */}
            <div className="text-[1.1rem] sm:text-[1.4rem] md:text-[1.6rem] font-black text-[#1a1f36] leading-none mt-1 sm:mt-1.5 relative z-10">
              ₹{todayNet.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>

            {/* Sub Pills */}
            <div className="flex gap-1.5 sm:gap-2 mt-auto pb-3 sm:pb-4 relative z-10">
              {/* CASH Pill */}
              <div 
                className="flex-1 rounded-[8px] sm:rounded-[12px] p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5"
                style={{
                  background: "linear-gradient(145deg, #ffffff 0%, #f3f4f6 100%)",
                  boxShadow: "2px 2px 5px rgba(0,0,0,0.03), -2px -2px 5px rgba(255,255,255,1), inset 0 0 0 1px rgba(255,255,255,0.6)"
                }}
              >
                <div className="text-emerald-600 drop-shadow-sm">
                  <i className="ph-fill ph-money text-[0.7rem] sm:text-[0.9rem]"></i>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[0.4rem] sm:text-[0.45rem] font-extrabold text-slate-500 uppercase tracking-wider leading-none">Cash</span>
                  <span className="text-[0.6rem] sm:text-[0.75rem] font-bold text-[#1a1f36] truncate leading-tight">₹{todayCashNet.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
              
              {/* UPI Pill */}
              <div 
                className="flex-1 rounded-[8px] sm:rounded-[12px] p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5"
                style={{
                  background: "linear-gradient(145deg, #ffffff 0%, #f3f4f6 100%)",
                  boxShadow: "2px 2px 5px rgba(0,0,0,0.03), -2px -2px 5px rgba(255,255,255,1), inset 0 0 0 1px rgba(255,255,255,0.6)"
                }}
              >
                <div className="text-indigo-600 drop-shadow-sm">
                  <i className="ph-bold ph-qr-code text-[0.7rem] sm:text-[0.9rem]"></i>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[0.4rem] sm:text-[0.45rem] font-extrabold text-slate-500 uppercase tracking-wider leading-none">UPI</span>
                  <span className="text-[0.6rem] sm:text-[0.75rem] font-bold text-[#1a1f36] truncate leading-tight">₹{todayUpiNet.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Background Chart / Bottom text */}
            <div className="absolute bottom-0 left-0 right-0 h-[40px] pointer-events-none flex flex-col justify-end overflow-hidden rounded-b-lg sm:rounded-b-[18px] md:rounded-b-[22px]">
              {/* Faint Background Line */}
              <svg viewBox="0 0 200 40" className="absolute bottom-2 left-0 w-full h-[30px] opacity-20" preserveAspectRatio="none">
                <path d="M0,20 Q20,5 40,20 T80,20 T120,15 T160,25 T200,10" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {/* Main Line */}
              <svg viewBox="0 0 200 40" className="absolute bottom-2 left-0 w-full h-[30px]" preserveAspectRatio="none">
                <path d="M0,35 Q20,25 40,30 T80,25 T120,32 T160,20 T200,28" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" className="animate-dash" strokeDasharray="300" strokeDashoffset="300" style={{ animationDelay: "550ms" }}/>
              </svg>
              
              <div className="flex items-center justify-center gap-1.5 mb-1 opacity-60">
                <div className="flex gap-0.5">
                   <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
                   <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
                   <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
                </div>
                <span className="text-[0.45rem] sm:text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest leading-none">Today</span>
                <div className="flex gap-0.5">
                   <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
                   <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
                   <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
                </div>
              </div>
            </div>

          </div>
        </Link>

        {/* Top Expense */}
        <Link href={`/transactions/allTransactions?categories=${highestExpenseCategory ? encodeURIComponent(highestExpenseCategory.category) : ''}`} className="block outline-none group min-w-0">
          <div className="bg-white rounded-lg sm:rounded-[18px] md:rounded-[22px] p-3 sm:p-4 md:p-5 shadow-sm sm:shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-slate-100/80 flex flex-col justify-between min-h-[110px] sm:h-[130px] md:h-[150px] animate-slide-up hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-orange-200" style={{ animationDelay: "250ms" }}>
            <span className="text-[0.55rem] sm:text-[0.6rem] md:text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-[1px]">Top Expense</span>
            <div className="flex items-center justify-between gap-1.5 sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] sm:text-[0.85rem] md:text-[0.95rem] font-extrabold text-slate-950 leading-tight truncate">
                  {highestExpenseCategory ? highestExpenseCategory.category : 'No expenses'}
                </p>
                <p className="text-[0.55rem] sm:text-[0.65rem] md:text-[0.75rem] text-slate-500 font-medium mt-0.5 leading-snug truncate">
                  of total expenses
                </p>
              </div>
              <div className="relative w-[48px] h-[32px] sm:w-[64px] sm:h-[42px] md:w-[80px] md:h-[52px] shrink-0">
                <svg viewBox="0 0 120 78" className="w-full h-full overflow-visible" aria-hidden="true">
                  <defs>
                    <linearGradient id="topExpenseGauge" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>
                  <path d="M 18 66 A 42 42 0 0 1 102 66" fill="none" stroke="#eef2f7" strokeWidth="14" strokeLinecap="round" />
                  <path d="M 18 66 A 42 42 0 0 1 102 66" fill="none" stroke="url(#topExpenseGauge)" strokeWidth="14" strokeLinecap="round" strokeDasharray="132" strokeDashoffset="132">
                    <animate attributeName="stroke-dashoffset" from="132" to={highestExpenseCategory ? 132 - (highestExpenseCategory.pct * 132) : 132} dur="1.5s" begin="600ms" fill="freeze" />
                  </path>
                </svg>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 font-extrabold text-[0.6rem] sm:text-[0.8rem] md:text-[1rem] text-slate-950 leading-none">
                  {highestExpenseCategory ? Math.round(highestExpenseCategory.pct * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Row 2: Income & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8 items-start">
          {/* Card 1: Income Sources */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="p-4 sm:p-5 pb-2">
              <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Income Sources (Today)</h3>
            </div>
            <div className="flex-1 p-4 sm:p-5 flex flex-col min-[760px]:flex-row lg:flex-col 2xl:flex-row items-center gap-5 sm:gap-6">
              {todayIncome === 0 ? (
                 <div className="w-full text-center text-slate-400 py-10 text-sm">No income recorded today</div>
              ) : (
              <>
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
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
                   <span className="text-[#0B1E40] font-black text-[1rem] sm:text-[1.1rem]">₹{todayIncome.toLocaleString('en-IN')}</span>
                 </div>
              </div>
              <div className="flex-1 flex flex-col gap-3 w-full">
                 {todayIncomeSegments.map((seg, i) => {
                   const iconStr = getRelatableIcon(seg.category);
                   return (
                   <div
                     key={i}
                     className={`flex items-center justify-between gap-3 group cursor-default transition-all duration-300 relative ${hoveredIncCat === seg.category ? 'sm:translate-x-3 bg-slate-50 p-2 -mx-2 rounded-xl shadow-sm' : ''}`}
                     onMouseEnter={() => setHoveredIncCat(seg.category)}
                     onMouseLeave={() => setHoveredIncCat(null)}
                   >
                     {hoveredIncCat === seg.category && (
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
            <div className="p-4 sm:p-5 pb-2 flex justify-between items-start">
              <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Expense Breakdown (Today)</h3>
            </div>
            <div className="flex-1 p-4 sm:p-5 flex flex-col min-[760px]:flex-row lg:flex-col 2xl:flex-row items-center gap-5 sm:gap-6">
               {todayExpense === 0 ? (
                 <div className="w-full text-center text-slate-400 py-10 text-sm">No expenses recorded today</div>
               ) : (
               <>
               <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
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
                    <span className="text-[#0B1E40] font-black text-[1rem] sm:text-[1.1rem]">₹{todayExpense.toLocaleString('en-IN')}</span>
                  </div>
               </div>
               <div className="flex-1 flex flex-col gap-3 w-full">
                 {sortedTodayExpenses.slice(0, 4).map((seg: any, i: number) => {
                   const iconStr = getRelatableIcon(seg.category);
                   const colorClass = getConsistentColorClasses(seg.category);
                   return (
                   <div
                     key={i}
                     className={`flex items-center justify-between gap-3 group cursor-default transition-all duration-300 relative ${hoveredExpCat === seg.category ? 'sm:translate-x-3 bg-slate-50 p-2 -mx-2 rounded-xl shadow-sm' : ''}`}
                     onMouseEnter={() => setHoveredExpCat(seg.category)}
                     onMouseLeave={() => setHoveredExpCat(null)}
                   >
                     {hoveredExpCat === seg.category && (
                       <div className="absolute -left-5 top-1/2 -translate-y-1/2 animate-pulse">
                         <i className={`ph-fill ph-caret-right ${colorClass.text} text-lg`}></i>
                       </div>
                     )}
                     <div className="flex items-center gap-3 min-w-0">
                       <div className={`w-10 h-10 rounded-xl ${colorClass.bg} ${colorClass.text} flex items-center justify-center shrink-0 border border-transparent group-hover:scale-110 transition-all`}>
                         <i className={`ph-bold ${iconStr} text-xl`}></i>
                       </div>
                       <span className="text-[0.8rem] font-bold text-[#0B1E40] truncate">{seg.category}</span>
                     </div>
                     <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/transactions/details/${txn.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/transactions/details/${txn.id}`);
                    }
                  }}
                  className="group/item flex flex-col sm:flex-row sm:items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-sm rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 border border-white/[0.06] hover:border-white/15 transition-all duration-200 cursor-pointer gap-2 sm:gap-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
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

      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">Weekly performance</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">Expenses, income, and net movement in one view</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
          <i className="ph-bold ph-calendar-blank text-indigo-500"></i>
          Last 7 days
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-5 mb-8 items-stretch">

        {/* Expense Heatmap Card */}
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
                {totalExpenses > 0 ? donutSegments.map((seg: any, i: number) => (
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
              {donutSegments.slice(0, 4).map((seg: any) => (
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
                    <span className="text-[0.65rem] font-bold text-slate-400 whitespace-nowrap">₹{seg.amount.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                  </div>
                </div>
              ))}
              {donutSegments.length === 0 && (
                 <span className="text-xs text-slate-400 text-center py-4">No expenses recorded.</span>
              )}
            </div>
          </div>

          {/* Footer Banner */}
          <div className="bg-[#F6F7FF] rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#EEF0FF] transition-colors mt-auto min-h-[64px]">
            <div className="flex items-center gap-2.5 min-w-0">
              <i className="ph-bold ph-chart-bar text-[#4F46E5] text-lg shrink-0"></i>
              <span className="text-xs xl:text-[0.8rem] font-bold text-slate-800 leading-snug">
                {highestExpenseCategory ? `${highestExpenseCategory.category} is your top expense (${Math.round(highestExpenseCategory.pct * 100)}%)` : "No expenses yet"}
              </span>
            </div>
            <i className="ph-bold ph-arrow-right text-[#4F46E5] shrink-0"></i>
          </div>
        </div>

        {/* Income Flow by Day Card */}
        <div className="h-full bg-white rounded-[24px] p-5 xl:p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-slate-100 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-5 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <i className="ph-fill ph-chart-line-up text-xl"></i>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-900 leading-tight truncate">Income Flow</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 truncate">Aggregated for selected period</p>
              </div>
            </div>
            <div className="px-2.5 py-2 border border-gray-200 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors shrink-0">
              <span className="text-xs font-bold text-slate-600">This week</span>
              <i className="ph-bold ph-caret-down text-slate-400 text-[10px]"></i>
            </div>
          </div>

          {/* Total Income Banner */}
          <div className="bg-[#FFF4ED] rounded-2xl p-4 mb-5">
            <span className="text-xs font-bold text-slate-500 mb-1 block">Total Income</span>
            <span className="text-2xl font-black text-[#F97316] leading-none block">₹{totalIncome.toLocaleString('en-IN')}</span>
          </div>

          {/* Bar Chart Area */}
          <div className="flex h-[178px] relative mb-5">
            {/* Y Axis */}
            <div className="flex flex-col justify-between text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-400 pb-6 pr-2 sm:pr-4 w-10 sm:w-12 shrink-0">
              <span>{maxFlow > 0 ? (maxFlow >= 1000 ? `${(maxFlow/1000).toFixed(1)}k` : maxFlow) : '1k'}</span>
              <span>{maxFlow > 0 ? (maxFlow >= 1000 ? `${((maxFlow*0.75)/1000).toFixed(1)}k` : Math.round(maxFlow*0.75)) : ''}</span>
              <span>{maxFlow > 0 ? (maxFlow >= 1000 ? `${((maxFlow*0.5)/1000).toFixed(1)}k` : Math.round(maxFlow/2)) : ''}</span>
              <span>{maxFlow > 0 ? (maxFlow >= 1000 ? `${((maxFlow*0.25)/1000).toFixed(1)}k` : Math.round(maxFlow*0.25)) : ''}</span>
              <span>₹0</span>
            </div>
            {/* Bars */}
            <div className="flex-1 flex justify-between items-end pb-6 relative">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none opacity-50">
                {[0,1,2,3,4].map(i => <div key={i} className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>)}
              </div>

              {dayLabels.map((day, idx) => {
                const val = actualFlow[idx];
                const isMax = val === Math.max(...actualFlow) && val > 0;
                const heightPct = maxFlow > 0 ? (val / maxFlow) * 100 : 0;
                return (
                  <div key={day} className="flex flex-col items-center justify-end w-full h-full relative z-10 group">
                    <div className="w-full h-full relative flex items-end justify-center">
                      {isMax && (
                        <span className="absolute bottom-[calc(100%+4px)] text-[0.6rem] sm:text-[0.7rem] font-black text-slate-800 whitespace-nowrap">₹{val.toLocaleString('en-IN')}</span>
                      )}
                      <div
                        className={`w-5 sm:w-6 lg:w-8 rounded-t-sm sm:rounded-t-lg transition-all ${isMax ? 'bg-[#F97316]' : 'bg-[#FFDCC3] hover:bg-[#FFB98A]'}`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      ></div>
                    </div>
                    <span className="absolute -bottom-6 text-[0.6rem] sm:text-[0.7rem] font-bold text-slate-400">{day.toUpperCase()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Info & Link */}
          <div className="mt-auto flex flex-col gap-3">
            <div className="bg-[#FFF8F3] rounded-2xl p-3.5 flex items-center gap-2.5 min-h-[64px]">
              <div className="w-8 h-8 rounded-full bg-[#FFE6D5] text-[#F97316] flex items-center justify-center shrink-0">
                <i className="ph-fill ph-lightbulb text-base"></i>
              </div>
              <span className="text-xs xl:text-[0.8rem] font-bold text-slate-800 leading-snug">
                {actualFlow.reduce((a,b) => a+b, 0) > 0 ? `Most of your income comes on ${dayLabels[activeFlowDay]}.` : 'Add income to see insights.'}
              </span>
            </div>
            <Link href="/transactions/allTransactions?view=week&type=INCOME" className="text-sm font-extrabold text-[#F97316] hover:text-orange-600 flex items-center gap-2 w-fit">
              View income <i className="ph-bold ph-arrow-right"></i>
            </Link>
          </div>
        </div>

        {/* Daily Net Trend Card */}
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

          {/* Chart Area */}
          <div className="flex h-[178px] relative mb-5">
            <div className="flex flex-col justify-between text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-400 pb-6 pr-2 sm:pr-4 w-10 sm:w-12 shrink-0">
              <span>{netMax >= 1000 ? `${(netMax/1000).toFixed(1)}k` : netMax > 0 ? netMax : '10k'}</span>
              <span>{netMax >= 1000 ? `${(netMax/2000).toFixed(1)}k` : netMax > 0 ? Math.round(netMax/2) : '5k'}</span>
              <span>₹0</span>
              <span>{netMin < 0 ? (netMin <= -1000 ? `${(netMin/1000).toFixed(1)}k` : netMin) : '-5k'}</span>
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

          {/* Footer Banner */}
          <div className="mt-auto flex flex-col gap-3">
            <div className="bg-[#F6F7FF] rounded-2xl p-3.5 flex items-center gap-2.5 min-h-[64px]">
              <div className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                <i className="ph-bold ph-arrow-up-right text-base"></i>
              </div>
              <span className="text-xs xl:text-[0.8rem] font-bold text-slate-800 leading-snug">
                Net trend improved by 12% compared to last week.
              </span>
            </div>
            <Link href="/transactions/allTransactions?view=week" className="text-sm font-extrabold text-[#4F46E5] hover:text-indigo-700 flex items-center gap-2 w-fit">
              View full trend <i className="ph-bold ph-arrow-right"></i>
            </Link>
          </div>
        </div>

      </div>

      {/* Smart Insight Banner */}
      <div className="mb-8">
        <div className="bg-[#FFF7F0] rounded-[2rem] p-6 sm:p-8 flex flex-col xl:flex-row items-center gap-6 shadow-sm border border-[#FFE8D6]">

          {/* Main Insight Text */}
          <div className="flex items-center gap-5 flex-1 w-full">
            <div className="w-14 h-14 rounded-full bg-[#FFE6D5] flex items-center justify-center shrink-0">
              <i className="ph-fill ph-lightbulb text-[#F97316] text-[1.8rem]"></i>
            </div>
            <div>
              <h3 className="text-[1.2rem] font-black text-slate-900 mb-1">Smart Insight</h3>
              <p className="text-[0.9rem] text-slate-600 font-medium">
                Your largest expense is <span className="font-bold text-slate-800">{highestExpenseCategory ? highestExpenseCategory.category : 'N/A'} ({highestExpenseCategory ? Math.round(highestExpenseCategory.pct * 100) : 0}%)</span>.<br className="hidden sm:block" />
                Try reviewing high recurring expenses to save more.
              </p>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            {/* Save Potential */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-4 w-full sm:w-auto min-w-[240px] shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0">
                <i className="ph-bold ph-trend-up text-[#059669] text-xl"></i>
              </div>
              <div>
                <p className="text-[0.8rem] font-bold text-slate-500 mb-0.5">You save potential</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[1.2rem] font-black text-[#059669]">₹{Math.round((highestExpenseCategory?.amount || 0) * 0.1).toLocaleString('en-IN')}</span>
                  <span className="text-[0.8rem] font-bold text-slate-400">/mo</span>
                </div>
                <p className="text-[0.7rem] font-semibold text-slate-400 mt-0.5">by optimizing top categories</p>
              </div>
            </div>

            {/* Stay on Track */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-4 w-full sm:w-auto min-w-[240px] shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <i className="ph-bold ph-shield-check text-[#2563EB] text-xl"></i>
              </div>
              <div>
                <p className="text-[0.8rem] font-bold text-slate-500 mb-0.5">Stay on track</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[1.2rem] font-black text-[#2563EB]">₹439</span>
                  <span className="text-[0.8rem] font-bold text-[#2563EB]">ahead</span>
                </div>
                <p className="text-[0.7rem] font-semibold text-slate-400 mt-0.5">of last week's average</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
