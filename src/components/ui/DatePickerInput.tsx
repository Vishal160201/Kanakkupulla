"use client";

import { useState, useRef, useEffect } from 'react';
import DayPicker from './DayPicker';

interface DatePickerInputProps {
  value: string | null;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  hasError?: boolean;
  mode?: 'day' | 'week' | 'month';
  className?: string;
}

export default function DatePickerInput({ value, onChange, placeholder, hasError, mode = 'day', className }: DatePickerInputProps) {
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

  const parsedDate = value ? new Date(value) : new Date();

  const handleDateChange = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${day}`);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder || "Select Date";
    
    if (mode === 'month') {
      return parsedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    if (mode === 'week') {
      const start = new Date(parsedDate);
      start.setDate(parsedDate.getDate() - parsedDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    const d = String(parsedDate.getDate()).padStart(2, '0');
    const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const y = String(parsedDate.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={className || `flex h-[45px] w-full items-center justify-between rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 active:scale-95 ${hasError ? 'border-red-50 ring-2 ring-red-500/20' : isOpen ? 'border-orange-300 ring-2 ring-orange-500/20' : 'border-gray-200'}`}
      >
        <span className={`flex-1 truncate transition-colors duration-300 ${value ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'}`}>
          {getDisplayValue()}
        </span>
        <i className={`ph-bold ph-calendar-blank text-[1.1rem] transition-colors duration-300 ${isOpen ? 'text-orange-500' : 'text-slate-400'}`}></i>
      </div>
      
      {isOpen && (
        <DayPicker 
          currentDate={parsedDate} 
          onChange={handleDateChange} 
          onClose={() => setIsOpen(false)} 
          mode={mode}
          align="right"
        />
      )}
    </div>
  );
}
