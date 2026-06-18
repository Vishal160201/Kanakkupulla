"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { TRANSACTION_CATEGORIES } from "@/lib/transactionConstants";

export interface TransactionFilters {
  dateFrom: string;
  dateTo: string;
  categories: string[];
  amountMin: string;
  amountMax: string;
}

interface TransactionFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
}

export default function TransactionFilterModal({ isOpen, onClose, activeFilters, onApply }: TransactionFilterModalProps) {
  const [filterState, setFilterState] = useState<TransactionFilters>(activeFilters);

  useEffect(() => {
    if (isOpen) {
      setFilterState(activeFilters);
    }
  }, [isOpen, activeFilters]);

  const toggleCategory = (cat: string) => {
    setFilterState(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const applyFilters = () => {
    onApply(filterState);
    onClose();
  };

  const resetFilters = () => {
    const emptyFilters = { dateFrom: '', dateTo: '', categories: [], amountMin: '', amountMax: '' };
    setFilterState(emptyFilters);
    onApply(emptyFilters);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] p-0 bg-white rounded-3xl overflow-visible border-0 shadow-2xl !rounded-3xl">
        <DialogHeader className="bg-slate-50 border-b border-gray-100 px-8 py-6 rounded-t-3xl">
          <DialogTitle className="text-xl font-extrabold text-slate-900">Filter Transactions</DialogTitle>
        </DialogHeader>
        <div className="px-8 py-6 overflow-visible">
          
          <div className="font-bold text-slate-500 text-[0.85rem] uppercase tracking-[0.5px] mb-3">Custom Date Range</div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <DatePickerInput value={filterState.dateFrom} onChange={val => setFilterState({...filterState, dateFrom: val})} placeholder="Start Date" />
            <DatePickerInput value={filterState.dateTo} onChange={val => setFilterState({...filterState, dateTo: val})} placeholder="End Date" />
          </div>
          
          <div className="font-bold text-slate-500 text-[0.85rem] uppercase tracking-[0.5px] mb-3">Category</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {TRANSACTION_CATEGORIES.map(cat => (
              <label key={cat} className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={filterState.categories.includes(cat)} onChange={() => toggleCategory(cat)} className="w-4 h-4 accent-orange-500" />
                <span className="text-[0.95rem] text-slate-700 font-medium">{cat}</span>
              </label>
            ))}
          </div>

          <div className="font-bold text-slate-500 text-[0.85rem] uppercase tracking-[0.5px] mb-3">Amount Range (₹)</div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm">
              <span className="text-slate-400 font-medium mr-1">Min</span>
              <input type="number" value={filterState.amountMin} onChange={(e) => setFilterState({...filterState, amountMin: e.target.value})} className="h-[45px] w-full outline-none text-[0.95rem] font-bold text-slate-700 bg-transparent" placeholder="0" />
            </div>
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm">
              <span className="text-slate-400 font-medium mr-1">Max</span>
              <input type="number" value={filterState.amountMax} onChange={(e) => setFilterState({...filterState, amountMax: e.target.value})} className="h-[45px] w-full outline-none text-[0.95rem] font-bold text-slate-700 bg-transparent" placeholder="Any" />
            </div>
          </div>
          
        </div>
        <div className="bg-slate-50 border-t border-gray-100 px-8 py-5 flex justify-end gap-3 rounded-b-3xl">
          <button className="px-5 py-2.5 rounded-full font-bold text-[0.95rem] text-slate-700 bg-white border border-gray-200 hover:bg-slate-50 transition-colors" onClick={resetFilters}>Reset</button>
          <button className="px-6 py-2.5 rounded-full font-bold text-[0.95rem] text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all" onClick={applyFilters}>Apply Filters</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
