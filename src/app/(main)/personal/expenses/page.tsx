"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { toast } from "sonner";
import { Trash2, Download, Calendar, FileText, Plus, AlertCircle, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'EMI', 'Entertainment', 'Health', 'Other'].map(c => ({ label: c, value: c }));
const TYPES = ['CREDIT', 'DEBIT'].map(t => ({ label: t, value: t }));

export default function PersonalExpensesPage() {
  const { data: expensesRaw, mutate, isLoading } = useSWR('/api/personal/expenses', fetcher);
  const expenses = expensesRaw === undefined ? undefined : (Array.isArray(expensesRaw) ? expensesRaw : (expensesRaw?.expenses ?? expensesRaw?.data ?? []));
  const { data: cardsRaw } = useSWR('/api/personal/cards', fetcher);
  const cards = cardsRaw === undefined ? undefined : (Array.isArray(cardsRaw) ? cardsRaw : (cardsRaw?.cards ?? cardsRaw?.data ?? []));
  const { data: emisRaw } = useSWR('/api/personal/emis', fetcher);
  const emis = emisRaw === undefined ? undefined : (Array.isArray(emisRaw) ? emisRaw : (emisRaw?.emis ?? emisRaw?.data ?? []));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '', amount: '', type: 'DEBIT', category: 'Food', date: new Date().toISOString().split('T')[0], paymentSource: 'Cash', notes: '',
    isEMI: false, emiId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const paymentSources = useMemo(() => {
    const list = [{ label: 'Cash', value: 'Cash' }];
    if (cards) {
      cards.forEach((c: any) => {
        list.push({ label: `${c.bank} ••••${c.lastFour}`, value: c.id });
      });
    }
    return list;
  }, [cards]);

  const emiOptions = useMemo(() => {
    const list = [{ label: 'None', value: '' }];
    if (emis) {
      emis.filter((e: any) => e.status !== 'COMPLETED').forEach((e: any) => {
        list.push({ label: e.title, value: e.id });
      });
    }
    return list;
  }, [emis]);

  const handleEmiChange = (val: string) => {
    if (!val) {
      setFormData({ ...formData, emiId: '', isEMI: false });
      return;
    }
    const selected = emis?.find((e: any) => e.id === val);
    if (selected) {
      setFormData({
        ...formData,
        emiId: val,
        isEMI: true,
        title: `EMI: ${selected.title}`,
        amount: selected.emiAmount.toString(),
        category: 'EMI',
        type: 'DEBIT',
        paymentSource: selected.cardId || 'Cash'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/personal/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Expense saved!");
      setFormData({ title: '', amount: '', type: 'DEBIT', category: 'Food', date: new Date().toISOString().split('T')[0], paymentSource: 'Cash', notes: '', isEMI: false, emiId: '' });
      setIsFormOpen(false);
      mutate();
    } catch (error) {
      toast.error("Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/personal/expenses/${id}`, { method: 'DELETE' });
      toast.success("Deleted!");
      setDeletingId(null);
      mutate();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleExportPDF = () => {
    if (!expenses || expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(14);
    
    const dates = expenses.map((e: any) => new Date(e.date).getTime());
    const startDate = new Date(Math.min(...dates)).toLocaleDateString();
    const endDate = new Date(Math.max(...dates)).toLocaleDateString();
    
    doc.text(`Personal Expense Report ${startDate} - ${endDate}`, 14, 15);
    
    const tableData = expenses.map((e: any) => [
      new Date(e.date).toLocaleDateString(),
      e.title,
      e.category,
      e.paymentSource,
      e.type,
      e.amount.toString()
    ]);

    autoTable(doc, {
      head: [['Date', 'Title', 'Category', 'Payment Source', 'Type', 'Amount']],
      body: tableData,
      startY: 20,
    });

    doc.save("personal-expenses.pdf");
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const dailySpendMap = useMemo(() => {
    const map = new Map<string, { total: number, items: any[] }>();
    if (!expenses) return map;
    expenses.forEach((e: any) => {
      if (e.type === 'CREDIT') return;
      const dStr = new Date(e.date).toISOString().split('T')[0];
      const existing = map.get(dStr) || { total: 0, items: [] };
      existing.total += e.amount;
      existing.items.push(e);
      map.set(dStr, existing);
    });
    return map;
  }, [expenses]);

  const maxDaySpend = useMemo(() => {
    let max = 0;
    dailySpendMap.forEach(v => { if (v.total > max) max = v.total; });
    return max;
  }, [dailySpendMap]);

  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const handleExportCSV = async () => {
    if (!expenses || expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    const dates = expenses.map((e: any) => new Date(e.date).getTime());
    const startDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
    const endDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/personal/expenses/export?format=csv&startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to generate CSV");
      const csvText = await res.text();
      
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `personal-expenses-${startDate}-to-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      toast.error("Failed to export CSV");
    }
  };

  const computeHeatmapColor = (ratio: number) => {
    if (ratio === 0) return 'rgb(255, 255, 255)';
    let r, g, b;
    if (ratio <= 0.5) {
      const p = ratio / 0.5;
      r = Math.round(255 + p * (254 - 255));
      g = Math.round(255 + p * (215 - 255));
      b = Math.round(255 + p * (170 - 255));
    } else {
      const p = (ratio - 0.5) / 0.5;
      r = Math.round(254 + p * (249 - 254));
      g = Math.round(215 + p * (115 - 215));
      b = Math.round(170 + p * (22 - 170));
    }
    return `rgb(${r}, ${g}, ${b})`;
  };

  const heatmapCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    heatmapCells.push(<div key={`empty-${i}`} className="h-10 rounded-md bg-transparent" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth, d);
    const dStr = dateObj.toISOString().split('T')[0];
    const dayData = dailySpendMap.get(dStr);
    const spend = dayData ? dayData.total : 0;
    
    let style = {};
    if (spend > 0 && maxDaySpend > 0) {
      const ratio = spend / maxDaySpend;
      style = { backgroundColor: computeHeatmapColor(ratio) };
    }

    heatmapCells.push(
      <div 
        key={dStr} 
        onClick={() => { if (spend > 0) setExpandedDay(expandedDay === dStr ? null : dStr); }}
        style={style}
        className={`h-10 rounded-md border border-gray-100 flex flex-col items-center justify-center text-xs transition-all ${spend > 0 ? 'cursor-pointer hover:border-orange-500 text-orange-950 font-bold shadow-sm' : 'bg-white text-slate-300'}`}
        title={spend > 0 ? `₹${spend.toLocaleString()}` : ''}
      >
        <span>{d}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-[scaleIn_300ms_ease-out]">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Expenses & Income</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="bg-white border border-[rgba(0,0,0,0.06)] text-slate-700 px-3 py-2 rounded-[12px] font-bold text-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-md transition-all flex items-center gap-2"
          >
            <FileText size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button 
            onClick={handleExportPDF}
            className="bg-white border border-[rgba(0,0,0,0.06)] text-slate-700 px-3 py-2 rounded-[12px] font-bold text-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-md transition-all flex items-center gap-2"
          >
            <Download size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-[12px] font-bold text-sm shadow-[0_2px_8px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)] transition-all flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={3} />
            <span className="hidden sm:inline">Add Expense</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-2xl bg-white rounded-[24px] shadow-2xl overflow-visible"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Add New Expense</h3>
                <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 z-50 relative md:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Linked EMI (Auto-fills form)</label>
                    <CustomDropdown options={emiOptions} value={formData.emiId} onChange={handleEmiChange} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Title *</label>
                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Lunch at Cafe" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Amount (₹) *</label>
                    <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
                  </div>
                  <div className="flex flex-col gap-1.5 z-50 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Type *</label>
                    <CustomDropdown options={TYPES} value={formData.type} onChange={val => setFormData({...formData, type: val as string})} />
                  </div>
                  <div className="flex flex-col gap-1.5 z-40 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Category *</label>
                    <CustomDropdown options={CATEGORIES} value={formData.category} onChange={val => setFormData({...formData, category: val as string})} />
                  </div>
                  <div className="flex flex-col gap-1.5 z-30 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date *</label>
                    <div className="h-[42px]">
                      <DatePickerInput value={formData.date} onChange={val => setFormData({...formData, date: val as string})} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 z-20 relative">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Source *</label>
                    <CustomDropdown options={paymentSources} value={formData.paymentSource} onChange={val => setFormData({...formData, paymentSource: val as string})} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="p-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]" placeholder="Optional notes..."></textarea>
                </div>
                <div className="flex justify-end mt-2">
                  <button disabled={isSubmitting} type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-[10px] font-bold text-sm shadow-sm hover:bg-slate-800 transition-transform active:scale-95 disabled:opacity-50">
                    {isSubmitting ? "Saving..." : "Save Expense"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[16px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition-all duration-200 ease-out mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-orange-500" strokeWidth={2.5} />
          <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Spend Heatmap</h3>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[0.65rem] font-bold text-slate-400 uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {heatmapCells}
        </div>
        
        {/* Inline expand for day's expenses */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out mt-4 ${expandedDay ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {expandedDay && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-y-auto max-h-[280px]">
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase">Expenses for {expandedDay}</h4>
              <div className="flex flex-col gap-2">
                {dailySpendMap.get(expandedDay)?.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{item.title}</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">{item.category} • {item.paymentSource}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-900">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-[10px] uppercase tracking-widest font-semibold text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[rgba(0,0,0,0.06)]">
                <th className="p-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Title</th>
                <th className="p-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="p-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Source</th>
                <th className="p-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="p-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses?.map((e: any) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors group animate-[slideUp_200ms_ease-out]">
                  <td className="p-4 text-[13px] font-semibold text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-bold text-slate-900 tracking-tight">{e.title}</td>
                  <td className="p-4 text-[13px] text-slate-500">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-widest uppercase">{e.category}</span>
                  </td>
                  <td className="p-4 text-[13px] font-semibold text-slate-500">{e.paymentSource}</td>
                  <td className={`p-4 text-sm font-bold tabular-nums text-right ${e.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {e.type === 'CREDIT' ? '+' : '-'}₹{e.amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-center relative">
                    <div className="flex justify-end relative h-6 overflow-hidden">
                      {/* Delete Flow */}
                      <div className={`flex items-center gap-2 absolute right-0 transition-all duration-300 ${deletingId === e.id ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
                        <button onClick={() => handleDelete(e.id)} className="text-[10px] bg-rose-500 text-white px-2 py-1 rounded font-bold hover:bg-rose-600 transition-colors uppercase tracking-wider">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-300 transition-colors uppercase tracking-wider">No</button>
                      </div>
                      <button 
                        onClick={() => setDeletingId(e.id)}
                        className={`text-slate-400 hover:text-rose-500 transition-all duration-300 ${deletingId === e.id ? 'opacity-0 translate-x-10' : 'opacity-0 group-hover:opacity-100 translate-x-0'}`}
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!expenses || expenses.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} strokeWidth={2} className="text-slate-300" />
                      <span className="text-sm font-semibold">No expenses recorded yet.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
