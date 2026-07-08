"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TimePickerInputProps {
  value: string | null; // HH:MM 24hr format
  onChange: (timeStr: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

export default function TimePickerInput({ value, onChange, placeholder = "hh:mm AM/PM", className, hasError }: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  const parseTime = useCallback((val: string | null) => {
    if (!val) return { h: '12', m: '00', p: 'AM' };
    
    // Check if it's already in 12hr format (e.g. "07:00 AM" or "6:30 PM")
    const match12 = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
    if (match12) {
      let h12 = parseInt(match12[1], 10);
      if (h12 === 0) h12 = 12;
      return { 
        h: String(h12 > 12 ? h12 % 12 : h12).padStart(2, '0'), 
        m: match12[2], 
        p: match12[3].toUpperCase() 
      };
    }

    // Check if it's 24hr format (e.g. "19:00" or "07:00")
    const match24 = val.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const h24 = parseInt(match24[1], 10);
      const m = match24[2];
      const p = h24 >= 12 ? 'PM' : 'AM';
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      return { h: String(h12).padStart(2, '0'), m, p };
    }
    
    return { h: '12', m: '00', p: 'AM' };
  }, []);

  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const [activeCol, setActiveCol] = useState<'h' | 'm' | 'p'>('h');

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const periods = ['AM', 'PM'];

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  const itemHeight = 36; // Height of each scroll item
  const visibleItems = 5;
  const listHeight = itemHeight * visibleItems;

  const getActiveItemFromScroll = (scrollTop: number, itemsCount: number) => {
    const idx = Math.round(scrollTop / itemHeight);
    return Math.max(0, Math.min(idx, itemsCount - 1));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'h' | 'm' | 'p') => {
    const target = e.currentTarget;
    const idx = getActiveItemFromScroll(target.scrollTop, type === 'h' ? hours.length : type === 'm' ? minutes.length : periods.length);
    if (type === 'h') setSelectedHour(hours[idx]);
    else if (type === 'm') setSelectedMinute(minutes[idx]);
    else if (type === 'p') setSelectedPeriod(periods[idx]);
  };

  const scrollToItem = (ref: React.RefObject<any>, index: number) => {
    if (ref.current) {
      ref.current.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
    }
  };

  // When opening, parse value and scroll to selection
  useEffect(() => {
    if (isOpen) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.h);
      setSelectedMinute(parsed.m);
      setSelectedPeriod(parsed.p);

      setTimeout(() => {
        scrollToItem(hourRef, hours.indexOf(parsed.h));
        scrollToItem(minuteRef, minutes.indexOf(parsed.m));
        scrollToItem(periodRef, periods.indexOf(parsed.p));
      }, 10);
    }
  }, [isOpen, value, parseTime]);

  const updateDropdownPosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popupHeight = listHeight + 80;
      
      let top = rect.bottom + 8;
      if (spaceBelow < popupHeight && rect.top > popupHeight) {
        top = rect.top - popupHeight - 8;
      }
      
      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${rect.left}px`,
        zIndex: 9999,
      });
    }
  }, [isOpen, listHeight]);

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

  const handleTimeSelect = () => {
    // Convert back to 24hr format
    let h24 = parseInt(selectedHour, 10);
    if (selectedPeriod === 'PM' && h24 < 12) h24 += 12;
    if (selectedPeriod === 'AM' && h24 === 12) h24 = 0;
    
    onChange(`${String(h24).padStart(2, '0')}:${selectedMinute}`);
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

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleTimeSelect();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (activeCol === 'h') setActiveCol('m');
      else if (activeCol === 'm') setActiveCol('p');
      else if (activeCol === 'p') setActiveCol('h');
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      
      if (activeCol === 'h') {
        const idx = hours.indexOf(selectedHour);
        let nextIdx = idx + dir;
        if (nextIdx < 0) nextIdx = hours.length - 1;
        if (nextIdx >= hours.length) nextIdx = 0;
        setSelectedHour(hours[nextIdx]);
        scrollToItem(hourRef, nextIdx);
      } else if (activeCol === 'm') {
        const idx = minutes.indexOf(selectedMinute);
        let nextIdx = idx + dir;
        if (nextIdx < 0) nextIdx = minutes.length - 1;
        if (nextIdx >= minutes.length) nextIdx = 0;
        setSelectedMinute(minutes[nextIdx]);
        scrollToItem(minuteRef, nextIdx);
      } else if (activeCol === 'p') {
        const idx = periods.indexOf(selectedPeriod);
        let nextIdx = idx + dir;
        if (nextIdx < 0) nextIdx = periods.length - 1;
        if (nextIdx >= periods.length) nextIdx = 0;
        setSelectedPeriod(periods[nextIdx]);
        scrollToItem(periodRef, nextIdx);
      }
    }
  };
  
  const displayValue = useMemo(() => {
    if (!value) return null;
    const p = parseTime(value);
    return `${p.h}:${p.m} ${p.p}`;
  }, [value, parseTime]);

  // Render a scroll column with padding items for center alignment
  const renderColumn = (
    items: string[], 
    selectedValue: string, 
    ref: React.RefObject<any>,
    type: 'h' | 'm' | 'p'
  ) => {
    return (
      <div 
        ref={ref}
        className={cn("flex flex-col overflow-y-auto no-scrollbar w-16 snap-y snap-mandatory cursor-pointer transition-colors", activeCol === type ? 'bg-orange-50/50 rounded-xl' : '')}
        style={{ height: `${listHeight}px`, scrollBehavior: 'smooth' }}
        onScroll={(e) => handleScroll(e, type)}
        onMouseEnter={() => setActiveCol(type)}
      >
        {/* Top padding */}
        <div style={{ height: `${itemHeight * 2}px`, flexShrink: 0 }} />
        {items.map(item => (
          <div 
            key={item}
            onClick={() => {
              if (type === 'h') setSelectedHour(item);
              else if (type === 'm') setSelectedMinute(item);
              else if (type === 'p') setSelectedPeriod(item);
              scrollToItem(ref, items.indexOf(item));
            }}
            className={cn(
              "flex-shrink-0 flex items-center justify-center text-sm font-medium transition-colors snap-center",
              selectedValue === item ? "text-orange-600 bg-orange-100/50 rounded-lg scale-110 active-item font-bold" : "text-slate-600 opacity-60 hover:opacity-100"
            )}
            style={{ height: `${itemHeight}px` }}
          >
            {item}
          </div>
        ))}
        {/* Bottom padding */}
        <div style={{ height: `${itemHeight * 2}px`, flexShrink: 0 }} />
      </div>
    );
  };

  const dropdownContent = isOpen ? (
    <div 
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 animate-in fade-in zoom-in-95 flex flex-col gap-3"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="flex gap-1 relative select-none">
        
        {renderColumn(hours, selectedHour, hourRef, 'h')}

        {/* Separator */}
        <div className="flex flex-col justify-center items-center font-bold text-slate-300 -mx-1" style={{ height: `${listHeight}px` }}>:</div>

        {renderColumn(minutes, selectedMinute, minuteRef, 'm')}

        <div className="flex flex-col justify-center items-center text-slate-200 border-l border-slate-100 px-1" style={{ height: `${listHeight}px` }}></div>

        {renderColumn(periods, selectedPeriod, periodRef, 'p')}
        
        {/* Selection Highlight Bar (pointer-events-none) */}
        <div className="absolute left-0 right-0 pointer-events-none border-y border-orange-200/50" style={{ top: `${itemHeight * 2}px`, height: `${itemHeight}px` }} />
      </div>
      
      <button 
        onClick={handleTimeSelect}
        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors"
      >
        Set Time
      </button>
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full outline-none" onKeyDown={handleKeyDown}>
      <div 
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        className={className || `flex h-[45px] w-full items-center justify-between rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-95 ${hasError ? 'border-red-500 ring-2 ring-red-500/20' : isOpen ? 'border-orange-300 ring-2 ring-orange-500/20' : 'border-gray-200'}`}
      >
        <span className={`flex-1 truncate whitespace-nowrap transition-colors duration-300 ${displayValue ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'}`}>
          {displayValue || placeholder}
        </span>
        <Clock size={18} className={`transition-colors duration-300 ${isOpen ? 'text-orange-500' : 'text-slate-400'}`} />
      </div>
      
      {isOpen && typeof document !== 'undefined' && createPortal(
        dropdownContent,
        document.body
      )}
    </div>
  );
}
