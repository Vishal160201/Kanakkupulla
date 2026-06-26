"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Target, ShoppingBag, PieChart as PieChartIcon, 
  ArrowRight, Users, Briefcase, Info, AlertTriangle, Calendar, CheckCircle2, CircleDashed, X
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];
const STATUS_COLORS: Record<string, string> = {
  'PENDING': '#f59e0b',
  'IN PRODUCTION': '#64748b',
  'READY': '#ea580c',
  'DELIVERED': '#14b8a6',
  'SHIPPED': '#3b82f6'
};

const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

export default function AnalyticsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState("this-month"); // 'today', 'this-week', 'this-month', 'this-year', 'custom'
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  
  // Confirmed custom date range for API
  const [confirmedCustomRange, setConfirmedCustomRange] = useState({ start: "", end: "" });

  const [activeRevenueSegment, setActiveRevenueSegment] = useState<string | null>(null);
  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);
  const [activeProductFilter, setActiveProductFilter] = useState<string | null>(null);
  const [activeClient, setActiveClient] = useState<any | null>(null);

  // Parse DD/MM/YYYY to YYYY-MM-DD for backend
  const parseDate = (ddmmyyyy: string) => {
    if (!ddmmyyyy) return null;
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const parsedStart = parseDate(customStart);
  const parsedEnd = parseDate(customEnd);
  const isInvalidRange = !parsedStart || !parsedEnd || parsedEnd < parsedStart;

  const handleConfirmCustom = () => {
    if (!isInvalidRange && parsedStart && parsedEnd) {
      const formatString = (d: Date) => d.toISOString().split('T')[0];
      setConfirmedCustomRange({ start: formatString(parsedStart), end: formatString(parsedEnd) });
      setDateRange('custom');
    }
  };

  const handleRangeChange = (range: string) => {
    setDateRange(range);
    // Reset filters
    setActiveDateFilter(null);
    setActiveProductFilter(null);
    setActiveClient(null);
  };

  // Query Params
  const queryStr = useMemo(() => {
    let q = `?range=${dateRange}`;
    if (dateRange === 'custom' && confirmedCustomRange.start && confirmedCustomRange.end) {
      q += `&startDate=${confirmedCustomRange.start}&endDate=${confirmedCustomRange.end}`;
    }
    return q;
  }, [dateRange, confirmedCustomRange]);

  const { data: analyticsData, isLoading } = useSWR(`/api/analytics/unified${queryStr}`, fetcher);

  const data = analyticsData || {};
  const metrics = data.metrics || {
    totalRevenue: 0, totalExpenses: 0, netProfit: 0, collectionRate: 0, 
    avgOrderValue: 0, topEarningCategory: "N/A", growthVelocity: "0.0"
  };

  const revenueIntelligence = data.revenueIntelligence || [];
  const bookingFunnel = data.bookingFunnel || [];
  const giftsPerformance = data.giftsPerformance || { topProducts: [], statusDistribution: [] };
  const collectionHealth = data.collectionHealth || { chart: [], overdue: [] };
  const clientInsights = data.clientInsights || { distribution: [], topClients: [] };
  const dailyTrends = data.dailyTrends || [];
  const insights = data.insights || [];

  // Derived filtered data
  const filteredDailyTrends = activeDateFilter 
    ? dailyTrends.filter((d: any) => d.date === activeDateFilter)
    : dailyTrends;

  const filteredOverdue = activeProductFilter
    ? collectionHealth.overdue.filter((o: any) => o.products?.includes(activeProductFilter))
    : collectionHealth.overdue;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-20 fade-in">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .fade-in-up { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
        .skeleton-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .history-panel-enter { max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s ease; margin-top: 0; border-width: 0; padding-top: 0; padding-bottom: 0; }
        .history-panel-enter-active { max-height: 500px; opacity: 1; margin-top: 1.5rem; border-width: 1px; padding-top: 1.25rem; padding-bottom: 1.25rem; }
      `}} />
      
      {/* Header & Date Toggles */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/60 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/50 shadow-sm fade-in-up">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Analytics Studio</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Moondot Studio Performance Dashboard</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-wrap md:flex-nowrap bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/50 w-full md:w-auto">
            {['today', 'this-week', 'this-month', 'this-year', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => handleRangeChange(range)}
                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[0.75rem] font-bold uppercase tracking-wider transition-all duration-300 ${
                  dateRange === range 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {range.replace('-', ' ')}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex flex-col gap-1 fade-in w-full md:w-auto mt-2 md:mt-0">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)} 
                  placeholder="DD/MM/YYYY" 
                  className={`w-28 text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                    customStart && !parsedStart ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                <span className="text-slate-300 font-bold">-</span>
                <input 
                  type="text" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)} 
                  placeholder="DD/MM/YYYY" 
                  className={`w-28 text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                    customEnd && !parsedEnd ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                <button 
                  onClick={handleConfirmCustom} 
                  disabled={isInvalidRange}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isInvalidRange 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Confirm
                </button>
              </div>
              {customStart && customEnd && isInvalidRange && (
                <div className="text-red-500 text-[0.65rem] font-bold px-1">Invalid range</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Smart Insights Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in-up delay-100 min-h-[72px]">
        {isLoading ? (
          <>
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl h-full w-full skeleton-pulse shadow-sm"></div>
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl h-full w-full skeleton-pulse shadow-sm"></div>
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl h-full w-full skeleton-pulse shadow-sm hidden lg:block"></div>
          </>
        ) : (
          insights.map((insight: string, idx: number) => (
            <div key={idx} className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0"><Info size={18} /></div>
              <p className="text-sm font-bold text-indigo-900 leading-snug">{insight}</p>
            </div>
          ))
        )}
      </div>

      {/* Section 1: Smart KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 fade-in-up delay-200">
        {[
          { label: "Total Revenue", val: formatCurrency(metrics.totalRevenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Expenses", val: formatCurrency(metrics.totalExpenses), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
          { label: "Net Profit", val: formatCurrency(metrics.netProfit), icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Collection Rate", val: `${metrics.collectionRate}%`, icon: PieChartIcon, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Avg Order Value", val: formatCurrency(metrics.avgOrderValue), icon: ShoppingBag, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
          { label: "Growth Velocity", val: metrics.growthVelocity === 'New' ? 'New' : `${metrics.growthVelocity}%`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
              <kpi.icon size={20} />
            </div>
            <div>
              <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">{kpi.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Layout for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in-up delay-300">
        
        {/* Section 2: Revenue Intelligence (Stacked Bar) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Briefcase size={18} className="text-indigo-500"/> Revenue Intelligence</h3>
            {activeDateFilter && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold text-indigo-700 fade-in">
                <span>{activeDateFilter}</span>
                <button onClick={() => setActiveDateFilter(null)} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"><X size={12} /></button>
              </div>
            )}
          </div>
          <div className="h-[200px] lg:h-[300px] w-full shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueIntelligence} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                onClick={(data: any) => {
                  if (data && data.activeLabel) {
                    setActiveDateFilter(activeDateFilter === data.activeLabel ? null : data.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v/1000}k`} />
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

        {/* Section 7: Daily Trends */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500"/> Daily Trends
            </h3>
          </div>
          <div className="h-[200px] lg:h-[300px] w-full shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredDailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} isAnimationActive={true} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} isAnimationActive={true} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section 3: Booking Funnel */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-[300px] lg:h-[400px]">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Target size={18} className="text-rose-500"/> Booking Funnel</h3>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
            {bookingFunnel.map((stage: any, i: number) => {
              const prev = i > 0 ? bookingFunnel[i-1].count : null;
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

        {/* Section 4: Gifts Performance */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ShoppingBag size={18} className="text-amber-500"/> Gifts Performance</h3>
            {activeProductFilter && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full text-xs font-bold text-amber-700 fade-in">
                <span>{activeProductFilter}</span>
                <button onClick={() => setActiveProductFilter(null)} className="hover:bg-amber-200 rounded-full p-0.5 transition-colors"><X size={12} /></button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8 flex-1">
            <div className="flex-1 flex flex-col h-[200px] lg:h-auto">
              <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-2">Top Products</h4>
              <div className="flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={giftsPerformance.topProducts} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                    onClick={(data: any) => {
                      if (data && data.activeLabel) {
                        setActiveProductFilter(activeProductFilter === data.activeLabel ? null : data.activeLabel);
                      }
                    }}
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
            
            <div className="flex-1 flex flex-col h-[200px] lg:h-auto">
              <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-2">Order Status</h4>
              <div className="flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={giftsPerformance.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} isAnimationActive={true}>
                      {giftsPerformance.statusDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Collection Health */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-[400px]">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><DollarSign size={18} className="text-emerald-500"/> Collection Health</h3>
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="h-[200px] lg:h-[300px] flex-1 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={collectionHealth.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="collected" stroke="#10b981" fillOpacity={1} fill="url(#colorCollected)" isAnimationActive={true} />
                  <Area type="monotone" dataKey="overdue" stroke="#ef4444" fillOpacity={1} fill="url(#colorOverdue)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="lg:w-72 flex flex-col">
              <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3">Overdue Orders</h4>
              <div className="flex-1 overflow-y-auto max-h-[250px] lg:max-h-[300px] flex flex-col gap-2 pr-1">
                {filteredOverdue.length === 0 ? (
                  <div className="text-sm text-slate-500 italic p-4 text-center bg-slate-50 rounded-xl">No overdue orders found!</div>
                ) : (
                  filteredOverdue.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{o.clientName}</div>
                        <div className="text-[0.65rem] text-slate-500 uppercase">{o.id.slice(-6)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-red-600">₹{o.amount.toLocaleString('en-IN')}</span>
                        <button 
                          onClick={() => router.push(`/gifts/orders/${o.id}`)}
                          className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Collect
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Client Insights */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-[400px]">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Users size={18} className="text-blue-500"/> Client Insights</h3>
          
          <div className="h-[150px] lg:h-[180px] w-full shrink-0 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clientInsights.distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#6366f1" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3 shrink-0">Top Clients</h4>
            <div className="overflow-y-auto flex-1 flex flex-col gap-2 pr-1">
              {clientInsights.topClients.map((c: any) => (
                <div 
                  key={c.id} 
                  onClick={() => setActiveClient(activeClient?.id === c.id ? null : c)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors group ${
                    activeClient?.id === c.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors truncate">{c.name}</span>
                  <span className="text-xs font-extrabold text-slate-500">₹{(c.spend/1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Section: Client History Panel (Appears below Client Insights) */}
        <div className={`lg:col-span-3 bg-white rounded-3xl border border-blue-200 shadow-sm flex flex-col ${activeClient ? 'history-panel-enter-active' : 'history-panel-enter'}`}>
          {activeClient && (
            <div className="px-5 h-full overflow-hidden">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Users size={18} className="text-blue-500"/> Transaction History: {activeClient.name}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeClient.transactions.length === 0 ? (
                      <tr><td colSpan={4} className="py-4 text-center text-slate-400">No recent transactions.</td></tr>
                    ) : (
                      activeClient.transactions.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="py-2 text-slate-700">{formatDateSimple(tx.date)}</td>
                          <td className="py-2 text-slate-700">{tx.category}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                              tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2 text-right font-bold text-slate-800">₹{tx.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function formatDateSimple(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
