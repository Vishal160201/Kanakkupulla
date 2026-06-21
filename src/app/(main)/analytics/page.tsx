"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("monthly"); // 'monthly', 'all-time', 'custom'
  // In a full implementation, you'd have date picker states here for 'custom'
  
  const { data: analyticsData, isLoading } = useSWR(`/api/analytics/unified?range=${dateRange}`, fetcher);

  const metrics = analyticsData?.metrics || {
    totalEarnings: 0,
    periodRevenue: 0,
    periodExpenses: 0,
    netProfit: 0,
    completedShoots: 0,
    pendingRetouch: 0,
    upcomingShoots: 0,
    growthVelocity: "0.0"
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto animate-[fadeIn_0.4s_ease-out]">
      
      {/* Hero Card */}
      <div className="bg-slate-900 rounded-[20px] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl transition-transform duration-300 hover:-translate-y-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0 group">
        <div className="absolute -top-[50px] -right-[50px] w-[250px] h-[250px] bg-orange-500 rounded-full blur-[90px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative z-10">
          <div className="text-slate-400 text-[0.75rem] font-bold tracking-[1px] mb-1.5 uppercase">Total Combined Earnings</div>
          <div className="text-[2.5rem] font-extrabold mb-4 tracking-tight text-white drop-shadow-md">
            {isLoading ? "..." : `₹${metrics.totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          
          <div className="flex flex-wrap gap-6 md:gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[0.5px]">Shoots Completed</span>
              <span className="text-[1.2rem] font-extrabold text-white">{isLoading ? "-" : metrics.completedShoots}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[0.5px]">Pending Retouch</span>
              <span className="text-[1.2rem] font-extrabold text-white">{isLoading ? "-" : metrics.pendingRetouch}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[0.5px]">Upcoming Shoots</span>
              <span className="text-[1.2rem] font-extrabold text-white">{isLoading ? "-" : metrics.upcomingShoots}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end w-full md:w-auto relative z-10 bg-white/5 backdrop-blur-sm px-5 py-4 rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors">
          <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[0.5px]">Growth Velocity</span>
          <span className="text-[1.8rem] font-extrabold text-white flex items-center gap-2">
            +{isLoading ? "-" : metrics.growthVelocity}% <i className="ph-bold ph-trend-up text-orange-400"></i>
          </span>
          <span className="text-slate-400 text-[0.8rem] mt-1 font-medium">vs last month</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <i className="ph-bold ph-trend-up text-[1.1rem]"></i>
            </div>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Period</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Period Revenue</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">₹{isLoading ? "..." : (metrics.periodRevenue/1000).toFixed(1) + "k"}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-red-200">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <i className="ph-bold ph-trend-down text-[1.1rem]"></i>
            </div>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Period</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Period Expenses</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">₹{isLoading ? "..." : (metrics.periodExpenses/1000).toFixed(1) + "k"}</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <i className="ph-bold ph-scales text-[1.1rem]"></i>
            </div>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Period</span>
          </div>
          <div>
            <div className="text-slate-400 font-bold text-[0.75rem] mb-0.5">Net Profit</div>
            <div className="text-[1.5rem] font-extrabold text-white leading-none tracking-tight">₹{isLoading ? "..." : (metrics.netProfit/1000).toFixed(1) + "k"}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-green-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
              <i className="ph-fill ph-wallet text-[1.1rem]"></i>
            </div>
            {(metrics.pendingDueAmount || 0) > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Collect</span>}
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Upcoming Dues (14d)</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">₹{isLoading ? "..." : (metrics.pendingDueAmount || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col mt-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[1.3rem] font-extrabold text-slate-900 tracking-tight">Detailed Analytics</h2>
          <div className="flex gap-2">
            <button onClick={() => setDateRange('monthly')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${dateRange === 'monthly' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>This Month</button>
            <button onClick={() => setDateRange('all-time')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${dateRange === 'all-time' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All Time</button>
          </div>
        </div>
        <p className="font-medium text-[0.85rem] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
          Unified real-time analytics engine powered by lightning-fast API aggregations. 
          Values update instantly based on the selected date range without refreshing the page!
        </p>
      </div>
    </div>
  );
}
