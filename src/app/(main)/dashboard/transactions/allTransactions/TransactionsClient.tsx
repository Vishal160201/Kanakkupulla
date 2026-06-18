"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "@/components/ui/DatePickerInput";
import CustomSelect from "@/components/ui/CustomSelect";

function ViewSelectorCard({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[45px] px-5 rounded-xl border border-slate-200 bg-white shadow-sm font-bold text-[0.95rem] text-slate-700 capitalize flex items-center gap-2.5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 active:scale-95 ${isOpen ? 'ring-2 ring-orange-500/20 border-orange-300' : ''}`}
      >
        {value}
        <i className={`ph-bold ph-caret-down text-slate-400 text-xs transition-transform duration-300 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-0 left-0 w-[180px] bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 p-2.5 z-[1000] flex flex-col gap-1.5 animate-slide-up origin-top-left">
          {['day', 'week', 'month'].map(opt => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[0.95rem] font-medium capitalize transition-all ${
                  isSelected 
                    ? 'bg-orange-50/50 border-2 border-orange-300 text-orange-600' 
                    : 'text-slate-600 hover:bg-slate-50 border-2 border-transparent'
                }`}
              >
                {opt}
                {isSelected && <i className="ph-bold ph-check text-orange-500"></i>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  );
}

function TransactionsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const activeView = searchParams.get('view') || 'month';
  const filterParams = {
    view: activeView,
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
    categories: searchParams.get('categories'),
    amountMin: searchParams.get('amountMin'),
    amountMax: searchParams.get('amountMax')
  };

  const hasCustomDateRange = filterParams.dateFrom || filterParams.dateTo;
  
  const handleViewChange = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    params.delete('dateFrom');
    params.delete('dateTo');
    params.delete('month');
    router.push(`?${params.toString()}`);
  };

  const generateMonthOptions = () => {
    return Array.from({length: 12}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { 
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      };
    });
  };

  const handleSpecificWeekFromDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // End of week (Saturday)
    
    const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;

    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'week');
    params.set('dateFrom', startStr);
    params.set('dateTo', endStr);
    router.push(`?${params.toString()}`);
  };

  const handleSpecificMonthFromDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'month');
    params.set('month', val);
    params.delete('dateFrom');
    params.delete('dateTo');
    router.push(`?${params.toString()}`);
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterParams.view && !hasCustomDateRange) params.append('view', filterParams.view);
      if (filterParams.dateFrom) params.append('dateFrom', filterParams.dateFrom);
      if (filterParams.dateTo) params.append('dateTo', filterParams.dateTo);
      if (filterParams.categories) params.append('categories', filterParams.categories);
      if (filterParams.amountMin) params.append('amountMin', filterParams.amountMin);
      if (filterParams.amountMax) params.append('amountMax', filterParams.amountMax);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTransactions();
        router.refresh();
      }
    } catch (e) { console.error(e); }
    setIsDeleting(false);
    setDeleteId(null);
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchParams]);

  return (
    <div className="animate-fade-in w-full">
      {/* Transaction Activity */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 animate-slide-up" style={{ animationDelay: "100ms" }}>
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Transaction History</h2>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{transactions.length} Records found</div>
          </div>
          
          {/* Preset Views & Pickers */}
          <div className="flex items-center gap-3 relative z-[50]">
            <ViewSelectorCard 
              value={activeView}
              onChange={(val) => handleViewChange(val)}
            />

            {activeView === 'day' && (
              <div className="w-[140px]">
                <DatePickerInput 
                  value={filterParams.dateFrom && filterParams.dateFrom === filterParams.dateTo ? filterParams.dateFrom : null}
                  onChange={(val) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('view', 'day');
                    params.set('dateFrom', val);
                    params.set('dateTo', val);
                    router.push(`?${params.toString()}`);
                  }}
                  placeholder="Select Day"
                  mode="day"
                />
              </div>
            )}

            {activeView === 'week' && (
              <div className="w-[200px]">
                <DatePickerInput 
                  value={filterParams.dateFrom && filterParams.dateTo ? filterParams.dateFrom : null}
                  onChange={handleSpecificWeekFromDate}
                  placeholder="Select Week"
                  mode="week"
                />
              </div>
            )}

            {activeView === 'month' && (
              <div className="w-[160px]">
                <DatePickerInput 
                  value={searchParams.get('month') ? `${searchParams.get('month')}-01` : null}
                  onChange={handleSpecificMonthFromDate}
                  placeholder="Select Month"
                  mode="month"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Active Filter Badges */}
        {(filterParams.dateFrom || filterParams.dateTo || filterParams.categories || filterParams.amountMin || filterParams.amountMax) && (
          <div className="flex flex-wrap gap-2 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mr-2">Active Filters:</span>
            {filterParams.dateFrom && <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">From: {filterParams.dateFrom}</span>}
            {filterParams.dateTo && <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">To: {filterParams.dateTo}</span>}
            {filterParams.categories && <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Cat: {filterParams.categories.split(',').length} selected</span>}
            {filterParams.amountMin && <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Min: ₹{filterParams.amountMin}</span>}
            {filterParams.amountMax && <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Max: ₹{filterParams.amountMax}</span>}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col gap-4 animate-pulse">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
                     <div className="space-y-2">
                       <div className="h-4 w-32 bg-slate-200 rounded"></div>
                       <div className="h-3 w-20 bg-slate-200 rounded"></div>
                     </div>
                   </div>
                   <div className="h-6 w-24 bg-slate-200 rounded"></div>
                 </div>
               ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <i className="ph ph-receipt text-4xl mb-2 opacity-50"></i>
              <p className="font-medium text-sm">No transactions found for this period.</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-slate-200 hover:shadow-md hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <i className={`ph-bold ${tx.type === 'INCOME' ? 'ph-money' : 'ph-credit-card'} text-xl`}></i>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm mb-1">
                      {tx.description ? tx.description.split(' - ')[0] : tx.category}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded tracking-wider uppercase">{tx.category}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{new Date(tx.date).toLocaleDateString()} &middot; {tx.paymentMode}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <div className={`font-bold text-base mb-1 ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'EXPENSE' ? '-' : ''}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-[9px] font-extrabold inline-block px-2 py-0.5 rounded tracking-wider uppercase ${tx.status === 'SETTLED' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                      {tx.status}
                    </div>
                  </div>
                  <button 
                    onClick={() => setDeleteId(tx.id)}
                    className="w-8 h-8 rounded-full hover:bg-rose-100 text-slate-300 hover:text-rose-600 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Transaction"
                  >
                    <i className="ph-bold ph-trash"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-[400px] p-8 text-center bg-white rounded-3xl border-0 shadow-2xl !rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-3xl mx-auto mb-5">
            <i className="ph-fill ph-trash"></i>
          </div>
          <DialogTitle className="text-xl font-extrabold text-slate-900 mb-2">Delete Transaction</DialogTitle>
          <p className="text-slate-500 text-[0.95rem] leading-relaxed mb-8">
            Are you sure you want to delete this transaction? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button 
              className="flex-1 px-5 py-2.5 rounded-full font-bold text-[0.95rem] text-slate-700 bg-white border border-gray-200 hover:bg-slate-50 transition-colors" 
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button 
              className="flex-1 px-5 py-2.5 rounded-full font-bold text-[0.95rem] text-white bg-red-500 hover:bg-red-600 shadow-md transition-all flex items-center justify-center gap-2" 
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransactionsClient() {
  return <TransactionsList />;
}
