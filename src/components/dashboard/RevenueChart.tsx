import React, { Component, ReactNode } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: { date: string; income: number; expense: number }[];
  periodIncome?: number;
  periodExpense?: number;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm h-full">
          Failed to load chart.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RevenueChart({ data, periodIncome = 0, periodExpense = 0 }: RevenueChartProps) {
  const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return '0';
    if (tickItem >= 100000) return `₹${(tickItem / 100000).toFixed(1)}L`;
    if (tickItem >= 1000) return `₹${(tickItem / 1000).toFixed(1)}k`;
    return `₹${tickItem}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl shadow-gray-200/50 min-w-[140px]">
          <p className="text-slate-800 text-[0.8rem] font-bold mb-3">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1.5 last:mb-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-500 text-[0.75rem] font-semibold">{entry.name}:</span>
              </div>
              <span className="text-slate-900 font-bold text-[0.85rem]">₹{entry.value.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[24px] p-5 md:p-6 border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-[1.1rem] font-extrabold text-slate-900 tracking-tight">Revenue vs. Expenses</h3>
          <p className="text-slate-400 text-[0.75rem] font-medium mb-4">Trend over selected period</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-500 text-[0.75rem] font-bold">Income</span>
              <span className="text-slate-900 text-[0.85rem] font-extrabold">₹{periodIncome.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-500 text-[0.75rem] font-bold">Expense</span>
              <span className="text-slate-900 text-[0.85rem] font-extrabold">₹{periodExpense.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors">
          <span className="text-xs font-semibold text-slate-700">Daily</span>
          <i className="ph ph-caret-down text-slate-400 text-[0.6rem]"></i>
        </div>
      </div>
      
      <div className="w-full h-[280px] mt-4">
        {data && data.length > 0 ? (
          <ErrorBoundary>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  axisLine={{ stroke: '#e2e8f0', strokeWidth: 2 }} 
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  dy={12}
                  minTickGap={30}
                />
                <YAxis 
                  tickFormatter={formatYAxis} 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name="Income"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  animationDuration={1000}
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  name="Expense"
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  animationDuration={1000}
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#ef4444' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ErrorBoundary>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 font-medium">
            No data available for this period.
          </div>
        )}
      </div>
    </div>
  );
}
