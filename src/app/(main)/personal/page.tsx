"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp, Wallet, Timer, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Custom animated counter hook
function useAnimatedCount(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
}

const formatINR = (val: number) => "₹" + val.toLocaleString('en-IN');

export default function PersonalOverviewPage() {
  const { data: summary, isLoading: isLoadingSummary, mutate: mutateSummary } = useSWR('/api/personal/summary', fetcher);
  const { data: emisRaw, isLoading: isLoadingEmis } = useSWR('/api/personal/emis', fetcher);
  const { data: expensesRaw, isLoading: isLoadingExpenses, mutate: mutateExpenses } = useSWR('/api/personal/expenses', fetcher);
  const { data: cardsRaw } = useSWR('/api/personal/cards', fetcher);
  const cardsArray = Array.isArray(cardsRaw) ? cardsRaw : (cardsRaw?.cards ?? cardsRaw?.data ?? []);

  const cardOptions = useMemo(() => {
    const list = [{ label: 'Cash', value: 'Cash' }];
    if (cardsArray) {
      cardsArray.forEach((c: any) => {
        list.push({ label: `${c.bank} ••••${c.lastFour}`, value: c.id });
      });
    }
    return list;
  }, [cardsArray]);

  const EXPENSE_CATEGORIES = [
    { label: 'Food & Dining', value: 'Food & Dining' },
    { label: 'Shopping', value: 'Shopping' },
    { label: 'Transportation', value: 'Transportation' },
    { label: 'Bills & Utilities', value: 'Bills & Utilities' },
    { label: 'Entertainment', value: 'Entertainment' },
    { label: 'Health & Fitness', value: 'Health & Fitness' },
    { label: 'Travel', value: 'Travel' },
    { label: 'General', value: 'General' }
  ];

  const INCOME_CATEGORIES = [
    { label: 'Salary', value: 'Salary' },
    { label: 'Freelance', value: 'Freelance' },
    { label: 'Investments', value: 'Investments' },
    { label: 'Other Income', value: 'Other Income' }
  ];

  const [timeRange, setTimeRange] = useState<'Daily'|'Weekly'|'Monthly'>('Monthly');
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '', amount: '', category: 'General', paymentSource: 'Cash', date: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickSubmit = async (e: React.FormEvent, type: 'DEBIT' | 'CREDIT') => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/personal/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type })
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(type === 'DEBIT' ? "Expense added!" : "Income added!");
      setFormData({ title: '', amount: '', category: 'General', paymentSource: 'Cash', date: new Date().toISOString().split('T')[0] });
      setExpenseFormOpen(false);
      setIncomeFormOpen(false);
      mutateExpenses();
      mutateSummary();
    } catch (error) {
      toast.error("Failed to add entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animated counters
  const totalSpent = useAnimatedCount(summary?.totalSpentMonth || 0);
  const totalIncome = useAnimatedCount(summary?.totalIncomeMonth || 0);
  const netBal = useAnimatedCount(Math.abs(summary?.netBalance || 0));
  const activeEmisCount = useAnimatedCount(summary?.activeEmisCount || 0);

  const isNetPositive = (summary?.netBalance || 0) >= 0;

  const expenses = expensesRaw === undefined ? undefined : (Array.isArray(expensesRaw) ? expensesRaw : (expensesRaw?.expenses ?? expensesRaw?.data ?? []));
  const emis = emisRaw === undefined ? undefined : (Array.isArray(emisRaw) ? emisRaw : (emisRaw?.emis ?? emisRaw?.data ?? []));
  
  const expensesArray = Array.isArray(expenses) ? expenses : [];
  const emisArray = Array.isArray(emis) ? emis : [];

  // Process data for charts
  const { pieData, barData } = useMemo(() => {
    if (!expenses) return { pieData: [], barData: [] };

    // Donut chart - spend by category
    const categoryTotals: Record<string, number> = {};
    expensesArray.forEach((e: any) => {
      if (e.type === 'DEBIT') {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      }
    });
    const pie = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Bar chart - grouping based on timeRange
    // Note: For a real app, you'd group by the actual dates. Here is a simplified grouping.
    const grouped: Record<string, { Income: number; Expense: number }> = {};
    
    expensesArray.forEach((e: any) => {
      const d = new Date(e.date);
      let key = "";
      if (timeRange === 'Daily') {
        key = d.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (timeRange === 'Weekly') {
        key = `Week ${Math.ceil(d.getDate() / 7)}`;
      } else {
        key = d.toLocaleDateString('en-US', { month: 'short' });
      }

      if (!grouped[key]) grouped[key] = { Income: 0, Expense: 0 };
      if (e.type === 'CREDIT') grouped[key].Income += e.amount;
      if (e.type === 'DEBIT') grouped[key].Expense += e.amount;
    });

    const bar = Object.entries(grouped).map(([name, data]) => ({ name, ...data }));
    
    return { pieData: pie, barData: bar };
  }, [expenses, expensesArray, timeRange]);

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#eab308'];

  return (
    <div className="flex flex-col gap-6 pb-20">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Overview</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => { setExpenseFormOpen(!expenseFormOpen); setIncomeFormOpen(false); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95"
          >
            <ArrowDownLeft size={18} strokeWidth={2.5} /> Add Expense
          </button>
          <button 
            onClick={() => { setIncomeFormOpen(!incomeFormOpen); setExpenseFormOpen(false); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95"
          >
            <ArrowUpRight size={18} strokeWidth={2.5} /> Add Income
          </button>
        </div>
      </div>

      {/* Quick Action Modal */}
      <Dialog open={expenseFormOpen || incomeFormOpen} onOpenChange={(open) => { if (!open) { setExpenseFormOpen(false); setIncomeFormOpen(false); } }}>
        <DialogContent className="max-w-[700px] w-[calc(100vw-2rem)] sm:w-full sm:max-w-[700px] p-0 bg-transparent border-0 shadow-none overflow-visible">
          <div className="bg-slate-50 rounded-3xl overflow-hidden shadow-2xl flex flex-col w-full relative">
            <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 bg-white border-b border-slate-100 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[0.65rem] font-bold uppercase tracking-[1px] ${expenseFormOpen ? 'text-rose-500' : 'text-emerald-500'}`}>
                    New Record
                  </span>
                  <DialogTitle className="text-[1.5rem] font-extrabold text-slate-900 mt-0.5">
                    {expenseFormOpen ? "Add Expense" : "Add Income"}
                  </DialogTitle>
                </div>
              </div>
            </div>
            
            <div className="px-5 sm:px-8 py-5 sm:py-6 overflow-y-auto max-h-[70vh]">
              <div className="bg-white rounded-2xl p-4 sm:p-6 mb-4 shadow-sm border border-slate-100">
                <div className="flex flex-col mb-5">
                  <div className="flex items-center gap-2.5 font-extrabold text-[1.1rem] text-slate-900 tracking-tight">
                    <i className={`ph-fill ${expenseFormOpen ? 'ph-trend-down text-rose-500' : 'ph-trend-up text-emerald-500'} text-[1.2rem]`}></i> Details
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                   {/* amount input */}
                   <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Amount (₹) *</label>
                    <div className="bg-white rounded-2xl border p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm border-slate-200 focus-within:border-orange-400">
                      <span className="text-2xl font-medium text-slate-400">₹</span>
                      <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full bg-transparent border-none outline-none text-4xl font-extrabold text-slate-900 placeholder:text-slate-200 appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" />
                    </div>
                   </div>

                   {/* other inputs */}
                   <div className="space-y-4">
                     <div>
                       <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Title *</label>
                       <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Groceries" className="flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-sm border-slate-200" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Category *</label>
                       <div className="h-[45px]">
                         <CustomDropdown options={expenseFormOpen ? EXPENSE_CATEGORIES : INCOME_CATEGORIES} value={formData.category} onChange={val => setFormData({...formData, category: val as string})} />
                       </div>
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Date *</label>
                     <DatePickerInput value={formData.date} onChange={val => setFormData({...formData, date: val as string})} />
                   </div>

                   <div>
                     <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">Payment Source *</label>
                     <div className="h-[45px]">
                       <CustomDropdown options={cardOptions} value={formData.paymentSource} onChange={val => setFormData({...formData, paymentSource: val as string})} />
                     </div>
                     {/* Show balance/limit */}
                     {(() => {
                       const sc = cardsArray.find((c: any) => c.id === formData.paymentSource);
                       if (sc) {
                         const val = sc.type === 'CREDIT' ? sc.creditLimit : sc.manualBalance;
                         const lbl = sc.type === 'CREDIT' ? 'Credit Limit' : 'Available Balance';
                         return (
                           <div className="mt-2 text-xs font-semibold text-slate-500 flex justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                             <span>{lbl}:</span>
                             <span className="text-slate-800 font-bold">{val != null ? formatINR(val) : 'N/A'}</span>
                           </div>
                         );
                       }
                       if (formData.paymentSource === 'Cash') {
                          return (
                            <div className="mt-2 text-xs font-semibold text-slate-500 flex justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                              <span>Cash Balance:</span>
                              <span className="text-slate-800 font-bold">Un-tracked</span>
                            </div>
                          );
                       }
                       return null;
                     })()}
                   </div>

                </div>
              </div>
            </div>

            <div className="px-5 sm:px-8 py-4 sm:py-5 bg-white border-t border-slate-100 flex justify-end gap-3 z-10 relative shrink-0 rounded-b-3xl">
              <button onClick={() => { setExpenseFormOpen(false); setIncomeFormOpen(false); }} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={(e) => handleQuickSubmit(e, expenseFormOpen ? 'DEBIT' : 'CREDIT')} disabled={isSubmitting || !formData.amount || !formData.title} className={`px-8 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${expenseFormOpen ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 hover:shadow-rose-500/40' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 hover:shadow-emerald-500/40'}`}>
                {isSubmitting ? <><i className="ph ph-circle-notch animate-spin"></i> Saving...</> : (expenseFormOpen ? "Save Expense" : "Save Income")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Spent This Month", value: totalSpent, color: "text-rose-500", accent: "bg-rose-500", iconBg: "bg-rose-100", icon: TrendingDown, delay: "0ms" },
          { label: "Income This Month", value: totalIncome, color: "text-emerald-500", accent: "bg-emerald-500", iconBg: "bg-emerald-100", icon: TrendingUp, delay: "80ms" },
          { label: "Net Balance", value: netBal, prefix: isNetPositive ? "+" : "-", color: isNetPositive ? "text-violet-600" : "text-rose-600", accent: "bg-violet-500", iconBg: "bg-violet-100", icon: Wallet, delay: "160ms" },
          { label: "Active EMIs", value: activeEmisCount, isMoney: false, color: "text-amber-500", accent: "bg-amber-500", iconBg: "bg-amber-100", icon: Timer, delay: "240ms" }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={i} 
              className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-200 ease-out flex relative overflow-hidden group"
              style={{ animation: `slideUp 400ms ease forwards ${kpi.delay}`, opacity: 0 }}
            >
              <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-md ${kpi.accent}`} />
              <div className="flex flex-col justify-between w-full pl-2">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${kpi.iconBg} transition-transform group-hover:scale-110`}>
                    <Icon size={16} className={kpi.color} strokeWidth={2.5} />
                  </div>
                </div>
                <span className={`text-3xl font-bold tabular-nums tracking-tight ${kpi.color}`}>
                  {kpi.prefix}{kpi.isMoney === false ? kpi.value : formatINR(kpi.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center md:justify-end">
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 animate-[fadeIn_0.5s_ease-out]">
          {['Daily', 'Weekly', 'Monthly'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                timeRange === range ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ animation: "slideUp 500ms ease forwards", opacity: 0 }}>
        
        <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col">
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-6">Spend by Category</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  isAnimationActive={true}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatINR(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col">
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-6">Income vs Expense ({timeRange})</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip formatter={(value: any) => formatINR(Number(value))} cursor={{ fill: '#f1f5f9' }} />
                <Legend />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={true} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={true} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upcoming EMIs */}
      {emisArray.filter((e: any) => e.status === 'ACTIVE').length > 0 && (
        <div className="mt-4" style={{ animation: "slideUp 600ms ease forwards", opacity: 0 }}>
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Upcoming EMI Dues</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emisArray.filter((e: any) => e.status === 'ACTIVE').map((emi: any) => {
              const due = new Date(emi.nextDueDate);
              const isOverdue = due < new Date();
              return (
                <div key={emi.id} className={`border rounded-[16px] p-4 flex items-center justify-between ${
                  isOverdue ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                }`}>
                  <div>
                    <h4 className="font-bold text-slate-900 tracking-tight">{emi.title}</h4>
                    <div className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest mt-1 ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                      <Calendar size={12} />
                      Due: {due.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold tabular-nums text-slate-900">{formatINR(emi.emiAmount)}</span>
                    {isOverdue && (
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center animate-[pulse_2s_infinite]">
                        <AlertCircle size={16} className="text-red-500" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}} />
    </div>
  );
}
