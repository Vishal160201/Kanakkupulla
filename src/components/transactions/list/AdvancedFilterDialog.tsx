"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TempFilters } from "./listFilters";
import DatePickerInput from "@/components/ui/DatePickerInput";

interface AdvancedFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempFilters: TempFilters;
  onChange: (filters: TempFilters) => void;
  onApply: () => void;
  onClearAll: () => void;
}

const TYPE_OPTIONS = [{v: 'ALL', l: 'All'}, {v: 'INCOME', l: 'Income'}, {v: 'EXPENSE', l: 'Expense'}];

const MODE_OPTIONS = [
  {v: 'ALL', l: 'All', icon: 'ph-bold ph-stack'},
  {v: 'UPI', l: 'UPI', icon: 'ph-bold ph-device-mobile'},
  {v: 'Cash', l: 'Cash', icon: 'ph-bold ph-money'},
  {v: 'Bank Transfer', l: 'Bank', icon: 'ph-bold ph-bank'},
  {v: 'Card', l: 'Card', icon: 'ph-bold ph-credit-card'},
];

const AMOUNT_INPUT_CLASS = "w-full h-12 pl-7 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all";

function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <i className={`ph-bold ${icon} text-orange-500`}></i>
      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{children}</span>
    </div>
  );
}

export default function AdvancedFilterDialog({ open, onOpenChange, tempFilters, onChange, onApply, onClearAll }: AdvancedFilterDialogProps) {
  const update = (patch: Partial<TempFilters>) => onChange({ ...tempFilters, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[500px] w-[calc(100vw-2rem)] sm:w-full p-0 bg-white rounded-3xl border-0 shadow-2xl overflow-hidden !rounded-3xl">
        <div className="px-5 sm:px-8 py-5 sm:py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <DialogTitle className="text-xl font-extrabold text-slate-900">Advanced Filters</DialogTitle>
          <button type="button" aria-label="Close filters" onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
            <i className="ph-bold ph-x"></i>
          </button>
        </div>

        <div className="p-5 sm:p-8 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Date Range */}
          <div>
            <SectionLabel icon="ph-calendar-blank">Date Range</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">From</label>
                <DatePickerInput
                  value={tempFilters.dateFrom || null}
                  onChange={value => update({ dateFrom: value })}
                  placeholder="Any date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">To</label>
                <DatePickerInput
                  value={tempFilters.dateTo || null}
                  onChange={value => update({ dateTo: value })}
                  placeholder="Any date"
                />
              </div>
            </div>
          </div>

          {/* Type & Payment Mode */}
          <div>
            <SectionLabel icon="ph-arrows-left-right">Transaction Type</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => update({ type: opt.v })}
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
            <SectionLabel icon="ph-credit-card">Payment Mode</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {MODE_OPTIONS.map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => update({ paymentMode: opt.v })}
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
            <SectionLabel icon="ph-currency-inr">Amount Range (₹)</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Min</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={tempFilters.amountMin}
                    onChange={e => update({ amountMin: e.target.value })}
                    className={AMOUNT_INPUT_CLASS}
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
                    onChange={e => update({ amountMax: e.target.value })}
                    className={AMOUNT_INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <SectionLabel icon="ph-tag">Categories</SectionLabel>
            <input
              type="text"
              placeholder="e.g. Wedding, Software, Rent"
              value={tempFilters.categories}
              onChange={e => update({ categories: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-slate-300"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Separate multiple categories with a comma</p>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-4 sm:py-5 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            className="flex-1 h-12 rounded-xl font-bold text-[0.95rem] text-slate-700 bg-white border border-gray-200 hover:bg-slate-100 transition-colors"
            onClick={onClearAll}
          >
            Clear All
          </button>
          <button
            type="button"
            className="flex-1 h-12 rounded-xl font-bold text-[0.95rem] text-white bg-orange-500 hover:bg-orange-600 shadow-[0_4px_10px_rgba(249,115,22,0.3)] transition-all"
            onClick={onApply}
          >
            Apply Filters
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
