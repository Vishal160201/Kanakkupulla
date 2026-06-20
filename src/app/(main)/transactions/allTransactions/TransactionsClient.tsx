"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "@/components/ui/DatePickerInput";
import PillSelect from "@/components/ui/PillSelect";
import { toast } from "sonner";

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // F5/P2: Pagination state
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const activeView = searchParams.get('view') || 'month';
  const filterParams = {
    view: activeView,
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
    categories: searchParams.get('categories'),
    amountMin: searchParams.get('amountMin'),
    amountMax: searchParams.get('amountMax'),
    type: searchParams.get('type'),
    paymentMode: searchParams.get('paymentMode')
  };

  const hasCustomDateRange = filterParams.dateFrom || filterParams.dateTo;

  // Bug fix: Always sync tempFilters from URL when filter modal opens so stale values are never shown
  const openFilterModal = () => {
    setTempFilters({
      dateFrom: filterParams.dateFrom || '',
      dateTo: filterParams.dateTo || '',
      categories: filterParams.categories || '',
      amountMin: filterParams.amountMin || '',
      amountMax: filterParams.amountMax || '',
      type: filterParams.type || 'ALL',
      paymentMode: filterParams.paymentMode || 'ALL'
    });
    setIsFilterModalOpen(true);
  };
  
  const [tempFilters, setTempFilters] = useState({
    dateFrom: '',
    dateTo: '',
    categories: '',
    amountMin: '',
    amountMax: '',
    type: 'ALL',
    paymentMode: 'ALL'
  });

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (tempFilters.dateFrom) params.set('dateFrom', tempFilters.dateFrom); else params.delete('dateFrom');
    if (tempFilters.dateTo) params.set('dateTo', tempFilters.dateTo); else params.delete('dateTo');
    if (tempFilters.categories) params.set('categories', tempFilters.categories.trim()); else params.delete('categories');
    if (tempFilters.amountMin) params.set('amountMin', tempFilters.amountMin); else params.delete('amountMin');
    if (tempFilters.amountMax) params.set('amountMax', tempFilters.amountMax); else params.delete('amountMax');
    if (tempFilters.type && tempFilters.type !== 'ALL') params.set('type', tempFilters.type); else params.delete('type');
    if (tempFilters.paymentMode && tempFilters.paymentMode !== 'ALL') params.set('paymentMode', tempFilters.paymentMode); else params.delete('paymentMode');
    
    if (tempFilters.dateFrom || tempFilters.dateTo) {
      params.delete('view');
      params.delete('month');
    }
    
    router.push(`?${params.toString()}`);
    setIsFilterModalOpen(false);
  };

  // Bug fix: Clear All must also clear the URL params so the data refreshes immediately
  const clearAllFilters = () => {
    setTempFilters({ dateFrom: '', dateTo: '', categories: '', amountMin: '', amountMax: '', type: 'ALL', paymentMode: 'ALL' });
    const params = new URLSearchParams();
    params.set('view', activeView);
    router.push(`?${params.toString()}`);
    setIsFilterModalOpen(false);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (transactions.length === 0) return;
    setExportMenuOpen(false);
    setIsExporting(true);
    try {
      if (format === 'csv') {
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined || val === '') return '""';
          let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        };
        const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Payment Mode', 'Status', 'Amount', 'Attachment URL', 'Custom Data', 'Booking ID'];
        const rows = transactions.map(tx => [
          escapeCsv(tx.id),
          escapeCsv(new Date(tx.date).toLocaleDateString('en-IN')),
          escapeCsv(tx.type),
          escapeCsv(tx.category),
          escapeCsv(tx.description),
          escapeCsv(tx.paymentMode),
          escapeCsv(tx.status),
          escapeCsv(tx.amount),
          escapeCsv(tx.attachmentUrl),
          escapeCsv(tx.customData),
          escapeCsv(tx.bookingId)
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `kanakkupulla-ledger-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const { jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF();
        doc.text("Transactions Ledger", 14, 15);
        const tableData = transactions.map(tx => [
          new Date(tx.date).toLocaleDateString('en-IN'),
          tx.type,
          tx.category,
          tx.description || '',
          tx.paymentMode,
          tx.status,
          tx.amount.toString()
        ]);
        autoTable(doc, {
          head: [['Date', 'Type', 'Category', 'Description', 'Payment Mode', 'Status', 'Amount']],
          body: tableData,
          startY: 20,
        });
        doc.save(`kanakkupulla-ledger-${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };
  
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

  const fetchTransactions = useCallback(async (cursor?: string) => {
    if (!cursor) {
      setIsLoading(true);
      setTransactions([]);
      setNextCursor(null);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const params = new URLSearchParams();
      if (filterParams.view && !hasCustomDateRange) params.append('view', filterParams.view);
      if (filterParams.dateFrom) params.append('dateFrom', filterParams.dateFrom);
      if (filterParams.dateTo) params.append('dateTo', filterParams.dateTo);
      if (filterParams.categories) params.append('categories', filterParams.categories);
      if (filterParams.amountMin) params.append('amountMin', filterParams.amountMin);
      if (filterParams.amountMax) params.append('amountMax', filterParams.amountMax);
      if (filterParams.type) params.append('type', filterParams.type);
      if (filterParams.paymentMode) params.append('paymentMode', filterParams.paymentMode);
      if (cursor) params.append('cursor', cursor);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Handle both old (array) and new ({ items, nextCursor }) response shapes
        const items = Array.isArray(data) ? data : (data.items ?? []);
        const nc = Array.isArray(data) ? null : (data.nextCursor ?? null);
        setTransactions(prev => cursor ? [...prev, ...items] : items);
        setNextCursor(nc);
      } else if (res.status === 401) {
        toast.error("Session expired. Please log in again.");
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
    setIsLoadingMore(false);
  }, [searchParams]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        // A5 FIX: Update local state immediately instead of relying on router.refresh()
        setTransactions(prev => prev.filter(tx => tx.id !== deleteId));
        toast.success("Transaction deleted.");
        router.refresh(); // also refresh server components (overview stats etc.)
      } else {
        toast.error("Failed to delete. Please try again.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error. Please try again.");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="animate-fade-in w-full">
      {/* Transaction Activity */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 animate-slide-up" style={{ animationDelay: "100ms" }}>
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Transaction History</h2>
            {/* U6 FIX: Hide record count while loading */}
            {!isLoading && (
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{transactions.length}{nextCursor ? '+' : ''} Records</div>
            )}
          </div>
          
          {/* Preset Views & Pickers */}
          <div className="flex flex-wrap items-center gap-3 relative z-[50]">
            <button onClick={openFilterModal} className={`h-[45px] px-4 rounded-xl border bg-white shadow-sm font-bold text-[0.95rem] flex items-center gap-2 transition-all hover:shadow-md hover:border-slate-300 active:scale-95 ${(filterParams.type || filterParams.paymentMode || filterParams.amountMin || filterParams.amountMax || filterParams.categories) ? 'border-orange-400 text-orange-600' : 'border-slate-200 text-slate-700'}`}>
              <i className="ph-bold ph-faders"></i> Filters
            </button>
            {transactions.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  disabled={isExporting}
                  className="h-[45px] px-4 rounded-xl border border-slate-200 bg-white shadow-sm font-bold text-[0.95rem] text-slate-700 flex items-center gap-2 transition-all hover:shadow-md hover:border-slate-300 active:scale-95"
                >
                  {isExporting ? (
                    <i className="ph ph-circle-notch animate-spin"></i>
                  ) : (
                    <i className="ph-bold ph-download-simple"></i>
                  )}
                  Export
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                      <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 text-[0.85rem] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <i className="ph-bold ph-file-csv text-lg text-emerald-500"></i> Export as CSV
                      </button>
                      <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 text-[0.85rem] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <i className="ph-bold ph-file-pdf text-lg text-rose-500"></i> Export as PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
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
        {(filterParams.dateFrom || filterParams.dateTo || filterParams.categories || filterParams.amountMin || filterParams.amountMax || (filterParams.type && filterParams.type !== 'ALL') || (filterParams.paymentMode && filterParams.paymentMode !== 'ALL')) && (
          <div className="flex flex-wrap gap-2 mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center mr-2"><i className="ph-bold ph-funnel mr-1"></i> Active Filters:</span>
            {filterParams.dateFrom && <span className="bg-white border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">From: {filterParams.dateFrom}</span>}
            {filterParams.dateTo && <span className="bg-white border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">To: {filterParams.dateTo}</span>}
            {filterParams.categories && <span className="bg-white border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Categories: {filterParams.categories}</span>}
            {filterParams.amountMin && <span className="bg-white border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Min: ₹{filterParams.amountMin}</span>}
            {filterParams.amountMax && <span className="bg-white border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Max: ₹{filterParams.amountMax}</span>}
            {filterParams.type && filterParams.type !== 'ALL' && <span className="bg-white border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Type: {filterParams.type}</span>}
            {filterParams.paymentMode && filterParams.paymentMode !== 'ALL' && <span className="bg-white border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Mode: {filterParams.paymentMode}</span>}
            <button onClick={clearAllFilters} className="ml-auto text-xs font-bold text-orange-500 hover:text-orange-700 transition-colors flex items-center gap-1"><i className="ph-bold ph-x"></i> Clear</button>
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
            // U3: Better empty state with CTA
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                <i className="ph-bold ph-receipt text-3xl text-orange-400"></i>
              </div>
              <p className="font-bold text-slate-700 text-base mb-1">No transactions found</p>
              <p className="font-medium text-sm text-center max-w-xs">
                {(filterParams.dateFrom || filterParams.dateTo || filterParams.type || filterParams.paymentMode || filterParams.categories)
                  ? 'No records match your active filters. Try clearing them to see all transactions.'
                  : 'Start building your ledger by clicking "Add Transaction" in the top bar.'}
              </p>
              {(filterParams.dateFrom || filterParams.dateTo || filterParams.type || filterParams.paymentMode || filterParams.categories) && (
                <button onClick={clearAllFilters} className="mt-4 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100 transition-colors">
                  Clear Filters
                </button>
              )}
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
                  {/* U4: Edit button */}
                  <button
                    onClick={() => router.push(`/transactions/${tx.id}/edit`)}
                    className="w-8 h-8 rounded-full hover:bg-orange-100 text-slate-300 hover:text-orange-600 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit Transaction"
                  >
                    <i className="ph-bold ph-pencil-simple"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* F5/P2: Load More button */}
        {nextCursor && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => fetchTransactions(nextCursor)}
              disabled={isLoadingMore}
              className="px-8 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <><i className="ph ph-circle-notch animate-spin"></i> Loading...</>
              ) : (
                <><i className="ph-bold ph-arrow-down"></i> Load More</>  
              )}
            </button>
          </div>
        )}
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

      {/* Advanced Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-[500px] p-0 bg-white rounded-3xl border-0 shadow-2xl overflow-hidden !rounded-3xl">
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <DialogTitle className="text-xl font-extrabold text-slate-900">Advanced Filters</DialogTitle>
            <button onClick={() => setIsFilterModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
              <i className="ph-bold ph-x"></i>
            </button>
          </div>
          
          <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Date Range */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <i className="ph-bold ph-calendar-blank text-orange-500"></i>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date Range</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">From</label>
                  <div className="relative">
                    <i className="ph-bold ph-calendar absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                    <input
                      type="date"
                      value={tempFilters.dateFrom}
                      onChange={e => setTempFilters({...tempFilters, dateFrom: e.target.value})}
                      className="w-full h-12 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">To</label>
                  <div className="relative">
                    <i className="ph-bold ph-calendar absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                    <input
                      type="date"
                      value={tempFilters.dateTo}
                      onChange={e => setTempFilters({...tempFilters, dateTo: e.target.value})}
                      className="w-full h-12 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Type & Payment Mode */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <i className="ph-bold ph-arrows-left-right text-orange-500"></i>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Transaction Type</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{v: 'ALL', l: 'All'}, {v: 'INCOME', l: 'Income'}, {v: 'EXPENSE', l: 'Expense'}].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setTempFilters({...tempFilters, type: opt.v})}
                    className={`h-11 rounded-xl font-bold text-sm transition-all border-2 ${
                      tempFilters.type === opt.v
                        ? opt.v === 'INCOME' ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]'
                        : opt.v === 'EXPENSE' ? 'bg-rose-500 text-white border-rose-500 shadow-[0_4px_12px_rgba(239,68,68,0.3)]'
                        : 'bg-slate-800 text-white border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <i className="ph-bold ph-credit-card text-orange-500"></i>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Mode</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {v: 'ALL', l: 'All', icon: 'ph-bold ph-stack'},
                  {v: 'UPI', l: 'UPI', icon: 'ph-bold ph-device-mobile'},
                  {v: 'Cash', l: 'Cash', icon: 'ph-bold ph-money'},
                  {v: 'Bank Transfer', l: 'Bank', icon: 'ph-bold ph-bank'},
                  {v: 'Card', l: 'Card', icon: 'ph-bold ph-credit-card'},
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setTempFilters({...tempFilters, paymentMode: opt.v})}
                    className={`h-11 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-1.5 ${
                      tempFilters.paymentMode === opt.v
                        ? 'bg-orange-500 text-white border-orange-500 shadow-[0_4px_12px_rgba(249,115,22,0.3)]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <i className={`${opt.icon} text-sm`}></i> {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Range */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <i className="ph-bold ph-currency-inr text-orange-500"></i>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount Range (₹)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Min</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={tempFilters.amountMin}
                      onChange={e => setTempFilters({...tempFilters, amountMin: e.target.value})}
                      className="w-full h-12 pl-7 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Max</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      placeholder="∞"
                      value={tempFilters.amountMax}
                      onChange={e => setTempFilters({...tempFilters, amountMax: e.target.value})}
                      className="w-full h-12 pl-7 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <i className="ph-bold ph-tag text-orange-500"></i>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Categories</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Wedding, Software, Rent"
                value={tempFilters.categories}
                onChange={e => setTempFilters({...tempFilters, categories: e.target.value})}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-slate-300"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">Separate multiple categories with a comma</p>
            </div>
          </div>
          
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button 
              className="flex-1 h-12 rounded-xl font-bold text-[0.95rem] text-slate-700 bg-white border border-gray-200 hover:bg-slate-100 transition-colors" 
              onClick={clearAllFilters}
            >
              Clear All
            </button>
            <button 
              className="flex-1 h-12 rounded-xl font-bold text-[0.95rem] text-white bg-orange-500 hover:bg-orange-600 shadow-[0_4px_10px_rgba(249,115,22,0.3)] transition-all" 
              onClick={applyFilters}
            >
              Apply Filters
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransactionsClient() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-4 animate-pulse p-8">
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
    }>
      <TransactionsList />
    </Suspense>
  );
}
