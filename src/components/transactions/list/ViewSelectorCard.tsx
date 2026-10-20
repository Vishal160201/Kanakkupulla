"use client";

import { useEffect, useRef, useState } from "react";

const VIEW_OPTIONS = ['day', 'week', 'month'];

export default function ViewSelectorCard({ value, onChange }: { value: string, onChange: (val: string) => void }) {
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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[45px] px-5 rounded-xl border border-slate-200 bg-white shadow-sm font-bold text-[0.95rem] text-slate-700 capitalize flex items-center gap-2.5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 active:scale-95 ${isOpen ? 'ring-2 ring-orange-500/20 border-orange-300' : ''}`}
      >
        {value || 'All time'}
        <i className={`ph-bold ph-caret-down text-slate-400 text-xs transition-transform duration-300 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-0 left-0 w-[180px] bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 p-2.5 z-[1000] flex flex-col gap-1.5 animate-slide-up origin-top-left">
          {VIEW_OPTIONS.map(opt => {
            const isSelected = value === opt;
            return (
              <button
                type="button"
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
