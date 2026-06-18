"use client";

import { useState, useRef, useEffect } from "react";

interface PillSelectProps {
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onChange: (val: string) => void;
  label?: string;
  id?: string;
}

export default function PillSelect({ options, value, onChange, label, id }: PillSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="relative" ref={ref} id={id}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full h-12 px-4 rounded-xl border bg-white text-sm font-semibold text-left flex items-center justify-between gap-2 transition-all
          ${isOpen ? "border-orange-400 ring-2 ring-orange-500/20" : "border-slate-200 hover:border-slate-300"}
        `}
      >
        <span className={`flex items-center gap-2 ${selected?.value !== options[0]?.value ? "text-slate-900" : "text-slate-500"}`}>
          {selected?.icon && <i className={`${selected.icon} text-base`}></i>}
          {selected?.label ?? options[0]?.label}
        </span>
        <i className={`ph-bold ph-caret-down text-slate-400 text-xs transition-transform duration-200 ${isOpen ? "rotate-180 text-orange-500" : ""}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full min-w-[160px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.18)] border border-slate-100 p-2 z-[200] flex flex-col gap-0.5 animate-slide-up">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all
                  ${isSelected
                    ? "bg-orange-50 text-orange-600 font-bold"
                    : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {opt.icon && <i className={`${opt.icon} text-base ${isSelected ? "text-orange-500" : "text-slate-400"}`}></i>}
                <span className="flex-1">{opt.label}</span>
                {isSelected && <i className="ph-bold ph-check text-orange-500 text-xs"></i>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
