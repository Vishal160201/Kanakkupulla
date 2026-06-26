"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomDropdownProps {
  options: (string | { label: string, value: string, color?: string })[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  error
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Add a small offset (8px) below the button
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
      window.addEventListener("scroll", updateDropdownPosition, true); // true for capture phase to catch all scrolls
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
      const selectedIdx = options.findIndex(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        return val === value;
      });
      setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    }
  }, [isOpen, options, value]);

  const handleSelect = (opt: any) => {
    const val = typeof opt === 'string' ? opt : opt.value;
    onChange(val);
    setIsOpen(false);
    buttonRef.current?.focus();
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
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          handleSelect(options[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const selectedOpt = options.find(opt => {
    const val = typeof opt === 'string' ? opt : opt.value;
    return val === value;
  });
  const displayText = selectedOpt ? (typeof selectedOpt === 'string' ? selectedOpt : selectedOpt.label) : placeholder;
  const displayColor = (selectedOpt && typeof selectedOpt !== 'string') ? selectedOpt.color : undefined;

  // Ensure scroll into view for keyboard nav
  useEffect(() => {
    if (isOpen && dropdownRef.current && focusedIndex >= 0) {
      const button = dropdownRef.current.children[focusedIndex] as HTMLElement;
      if (button) {
        button.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const dropdownContent = isOpen ? (
    <div 
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-2"
    >
      {options.length === 0 ? (
        <div className="p-3 text-center text-sm text-slate-400">No options</div>
      ) : (
        options.map((opt, idx) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          const color = typeof opt === 'string' ? undefined : opt.color;
          const isSelected = val === value;
          const isFocused = idx === focusedIndex;
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(opt)}
              onMouseEnter={() => setFocusedIndex(idx)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors text-left outline-none",
                isSelected ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700",
                isFocused && !isSelected ? "bg-slate-50" : "",
                isFocused && isSelected ? "ring-2 ring-blue-500/20" : ""
              )}
            >
              <div className="flex items-center gap-2 truncate">
                {color && (
                  <div 
                    className={cn("w-3 h-3 rounded-full shrink-0", !color.startsWith('#') ? color : '')}
                    style={color.startsWith('#') ? { backgroundColor: color } : {}}
                  />
                )}
                <span className="truncate">{label}</span>
              </div>
              {isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
            </button>
          );
        })
      )}
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
          !value && "text-slate-400",
          value && "text-slate-800 font-medium"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {displayColor && (
            <div 
              className={cn("w-3 h-3 rounded-full shrink-0", !displayColor.startsWith('#') ? displayColor : '')}
              style={displayColor.startsWith('#') ? { backgroundColor: displayColor } : {}}
            />
          )}
          <span className="truncate">{displayText}</span>
        </div>
        <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        dropdownContent,
        document.body
      )}
    </div>
  );
}
