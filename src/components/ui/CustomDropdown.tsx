"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface CustomDropdownProps {
  options: string[];
  value: string | string[];
  onChange: (val: any) => void;
  isMulti?: boolean;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  isMulti = false,
  placeholder = "Select...",
  className,
  error
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [isOpen]);

  const selectedArray = isMulti 
    ? (Array.isArray(value) ? value : (typeof value === 'string' && value ? value.split(',').map(s => s.trim()) : []))
    : (typeof value === 'string' && value ? [value] : []);

  const handleSelect = (opt: string) => {
    if (isMulti) {
      let newVals;
      if (selectedArray.includes(opt)) {
        newVals = selectedArray.filter(v => v !== opt);
      } else {
        newVals = [...selectedArray, opt];
      }
      onChange(newVals.join(', '));
    } else {
      onChange(opt);
      setIsOpen(false);
    }
  };

  const displayText = selectedArray.length > 0
    ? (isMulti ? `${selectedArray.length} selected` : selectedArray[0])
    : placeholder;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger 
        render={
          <button 
            type="button" 
            ref={triggerRef}
            className={cn(
              "flex h-[45px] w-full items-center justify-between rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
              error ? "border-red-500" : "border-slate-200 hover:border-slate-300",
              !selectedArray.length && "text-slate-400",
              selectedArray.length > 0 && "text-slate-800 font-medium",
              className
            )}
          />
        }
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </PopoverTrigger>

      <PopoverContent 
        style={{ width: triggerWidth ? `${triggerWidth}px` : 'auto' }}
        className="p-1.5 shadow-xl border-slate-100 max-h-[250px] overflow-y-auto"
      >
        {options.length === 0 ? (
          <div className="p-3 text-center text-sm text-slate-400">No options</div>
        ) : (
          options.map((opt) => {
            const isSelected = selectedArray.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isSelected ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="truncate">{opt}</span>
                {isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
              </button>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}
