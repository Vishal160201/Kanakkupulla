"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomMultiDropdownProps {
  options: (string | { label: string, value: string })[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export default function CustomMultiDropdown({
  options,
  value = [],
  onChange,
  placeholder = "Select...",
  className,
  error
}: CustomMultiDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Local state so we don't apply immediately until "Done" is clicked
  const [localValue, setLocalValue] = useState<string[]>(value);

  useEffect(() => {
    setLocalValue(value || []);
  }, [value, isOpen]);

  const updateDropdownPosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Reset focus when opened
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
    }
  }, [isOpen]);

  const handleToggle = (val: string) => {
    setLocalValue(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleDone = () => {
    onChange(localValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLocalValue([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
      case ' ': // Space to toggle checkbox
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          const opt = options[focusedIndex];
          const val = typeof opt === 'string' ? opt : opt.value;
          handleToggle(val);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        // Tab typically moves focus. We can just let it or close it.
        // For simplicity, we can focus the 'Done' button. But just preventDefault to keep it inside or close it.
        break;
    }
  };

  // Ensure scroll into view for keyboard nav
  useEffect(() => {
    if (isOpen && dropdownRef.current && focusedIndex >= 0) {
      const container = dropdownRef.current.querySelector('.options-container');
      if (container) {
        const item = container.children[focusedIndex] as HTMLElement;
        if (item) {
          item.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }, [focusedIndex, isOpen]);

  const dropdownContent = isOpen ? (
    <div 
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col gap-1 max-h-[300px] animate-in fade-in slide-in-from-top-2 p-2"
    >
      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-100 pb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Options</span>
        {localValue.length > 0 && (
          <button 
            type="button" 
            onClick={handleClearAll}
            className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors flex items-center gap-1"
          >
            <X size={12} /> Clear All
          </button>
        )}
      </div>

      <div className="options-container overflow-y-auto flex-1 p-1 flex flex-col gap-1 max-h-[200px] custom-scrollbar">
        {options.length === 0 ? (
          <div className="p-3 text-center text-sm text-slate-400">No options</div>
        ) : (
          options.map((opt, idx) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            const isSelected = localValue.includes(val);
            const isFocused = idx === focusedIndex;

            return (
              <label
                key={idx}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left cursor-pointer",
                  isSelected ? "bg-blue-50/50" : "",
                  isFocused && !isSelected ? "bg-slate-50" : "",
                  isFocused && isSelected ? "ring-2 ring-blue-500/20" : ""
                )}
              >
                <input 
                  type="checkbox" 
                  className="w-4 h-4 accent-blue-600 rounded border-gray-300 cursor-pointer"
                  checked={isSelected}
                  onChange={() => handleToggle(val)}
                  tabIndex={-1} // Prevent tab stopping on checkboxes, managed by container keys
                />
                <span className="truncate flex-1 text-slate-700 font-medium">{label}</span>
              </label>
            );
          })
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 px-1 shrink-0">
        <button 
          type="button"
          onClick={handleDone}
          className="w-full py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          Done
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button 
        ref={buttonRef}
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-[45px] w-full items-center justify-between rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
          error ? "border-red-500" : "border-slate-200 hover:border-slate-300",
          value.length === 0 && "text-slate-400"
        )}
      >
        {value.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {value.length} selected
            </span>
          </div>
        ) : (
          <span className="truncate">{placeholder}</span>
        )}
        <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        dropdownContent,
        document.body
      )}
    </div>
  );
}
