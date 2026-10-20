"use client";

import { useState } from "react";
import DatePickerInput from "@/components/ui/DatePickerInput";
import ViewSelectorCard from "./ViewSelectorCard";
import type { ListFilterParams } from "./listFilters";

interface TransactionsToolbarProps {
  filterParams: ListFilterParams;
  activeView: string | null;
  canExport: boolean;
  isExporting: boolean;
  onOpenFilters: () => void;
  onExport: (format: 'csv' | 'pdf') => void;
  onViewChange: (view: string) => void;
  onDayChange: (date: string) => void;
  onWeekChange: (date: string) => void;
  onMonthChange: (date: string) => void;
}

const todayIso = () => new Date().toISOString().split('T')[0];

export default function TransactionsToolbar({
  filterParams,
  activeView,
  canExport,
  isExporting,
  onOpenFilters,
  onExport,
  onViewChange,
  onDayChange,
  onWeekChange,
  onMonthChange,
}: TransactionsToolbarProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const hasActiveFilters = filterParams.type || filterParams.paymentMode || filterParams.amountMin || filterParams.amountMax || filterParams.categories;

  const handleExport = (format: 'csv' | 'pdf') => {
    setExportMenuOpen(false);
    onExport(format);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 relative z-[50]">
      <button type="button" onClick={onOpenFilters} className={`h-[45px] px-4 rounded-xl border bg-white shadow-sm font-bold text-[0.95rem] flex items-center gap-2 transition-all hover:shadow-md hover:border-slate-300 active:scale-95 ${hasActiveFilters ? 'border-orange-400 text-orange-600' : 'border-slate-200 text-slate-700'}`}>
        <i className="ph-bold ph-faders"></i> Filters
      </button>
      {canExport && (
        <div className="relative">
          <button
            type="button"
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
              <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setExportMenuOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                <button type="button" onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 text-[0.85rem] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <i className="ph-bold ph-file-csv text-lg text-emerald-500"></i> Export as CSV
                </button>
                <button type="button" onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 text-[0.85rem] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <i className="ph-bold ph-file-pdf text-lg text-rose-500"></i> Export as PDF
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <ViewSelectorCard
        value={activeView ?? ''}
        onChange={onViewChange}
      />

      {activeView === 'day' && (
        <div className="w-[140px]">
          <DatePickerInput
            value={(filterParams.dateFrom && filterParams.dateFrom === filterParams.dateTo) ? filterParams.dateFrom : todayIso()}
            onChange={onDayChange}
            placeholder="Select Day"
            mode="day"
          />
        </div>
      )}

      {activeView === 'week' && (
        <div className="w-[200px]">
          <DatePickerInput
            value={(filterParams.dateFrom && filterParams.dateTo) ? filterParams.dateFrom : todayIso()}
            onChange={onWeekChange}
            placeholder="Select Week"
            mode="week"
          />
        </div>
      )}

      {activeView === 'month' && (
        <div className="w-[160px]">
          <DatePickerInput
            value={filterParams.month ? `${filterParams.month}-01` : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`}
            onChange={onMonthChange}
            placeholder="Select Month"
            mode="month"
          />
        </div>
      )}
    </div>
  );
}
