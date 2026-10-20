"use client";

import { useState } from "react";

const RANGES = ['today', 'this-week', 'this-month', 'this-year', 'custom'];

// Parse DD/MM/YYYY to a Date for the backend
const parseDate = (ddmmyyyy: string) => {
  if (!ddmmyyyy) return null;
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const toIsoDate = (d: Date) => d.toISOString().split('T')[0];

interface AnalyticsHeaderProps {
  dateRange: string;
  onRangeChange: (range: string) => void;
  /** Called with YYYY-MM-DD bounds once a valid custom range is confirmed. */
  onConfirmCustom: (range: { start: string; end: string }) => void;
}

export default function AnalyticsHeader({ dateRange, onRangeChange, onConfirmCustom }: AnalyticsHeaderProps) {
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const parsedStart = parseDate(customStart);
  const parsedEnd = parseDate(customEnd);
  const isInvalidRange = !parsedStart || !parsedEnd || parsedEnd < parsedStart;

  const handleConfirmCustom = () => {
    if (!isInvalidRange && parsedStart && parsedEnd) {
      onConfirmCustom({ start: toIsoDate(parsedStart), end: toIsoDate(parsedEnd) });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/60 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/50 shadow-sm fade-in-up">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Analytics Studio</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Moondot Studio Performance Dashboard</p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
        <div className="flex flex-wrap md:flex-nowrap bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/50 w-full md:w-auto">
          {RANGES.map((range) => (
            <button
              type="button"
              key={range}
              onClick={() => onRangeChange(range)}
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
                aria-label="Custom range start date"
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
                aria-label="Custom range end date"
                className={`w-28 text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                  customEnd && !parsedEnd ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              <button
                type="button"
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
  );
}
