"use client";

import { useState, useRef, useEffect } from 'react';

interface MonthYearPickerProps {
  currentDate: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function MonthYearPicker({ currentDate, onChange, onClose }: MonthYearPickerProps) {
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Calculate year decade for year view
  const startYear = Math.floor(viewYear / 10) * 10;
  const years = Array.from({ length: 12 }).map((_, i) => startYear - 1 + i);

  return (
    <div 
      ref={containerRef}
      className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-[1000] w-[320px] p-5"
    >
      <div className="flex justify-between items-center mb-6 px-2">
        <button 
          onClick={() => {
            if (mode === 'month') setViewYear(viewYear - 1);
            else setViewYear(viewYear - 10);
          }}
          className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
        >
          <i className="ph-bold ph-caret-left text-lg"></i>
        </button>
        
        <button 
          onClick={() => setMode(mode === 'month' ? 'year' : 'month')}
          className="bg-transparent border-none cursor-pointer font-bold text-lg text-slate-800 hover:text-[#7ec0b1] transition-colors"
        >
          {mode === 'month' ? viewYear : `${startYear} - ${startYear + 9}`}
        </button>

        <button 
          onClick={() => {
            if (mode === 'month') setViewYear(viewYear + 1);
            else setViewYear(viewYear + 10);
          }}
          className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
        >
          <i className="ph-bold ph-caret-right text-lg"></i>
        </button>
      </div>

      {mode === 'month' ? (
        <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-2">
          {months.map((month, index) => {
            const isSelected = currentDate.getMonth() === index && currentDate.getFullYear() === viewYear;
            return (
              <button
                key={month}
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(viewYear);
                  newDate.setMonth(index);
                  onChange(newDate);
                }}
                className={`w-[52px] h-[52px] flex items-center justify-center rounded-full mx-auto text-lg transition-colors ${isSelected ? 'bg-[#7ec0b1] text-white font-medium shadow-sm' : 'bg-transparent text-slate-800 font-normal hover:bg-slate-50 cursor-pointer'}`}
              >
                {month}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-2">
          {years.map((year, index) => {
            const isSelected = currentDate.getFullYear() === year;
            const isOutsideDecade = index === 0 || index === 11;
            return (
              <button
                key={year}
                disabled={isOutsideDecade}
                onClick={() => {
                  setViewYear(year);
                  setMode('month');
                }}
                className={`w-[52px] h-[52px] flex items-center justify-center rounded-full mx-auto text-base transition-colors ${isSelected ? 'bg-[#7ec0b1] text-white font-medium shadow-sm' : isOutsideDecade ? 'text-slate-300 cursor-default' : 'bg-transparent text-slate-800 font-normal hover:bg-slate-50 cursor-pointer'}`}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
