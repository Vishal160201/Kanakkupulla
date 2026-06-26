"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { format, addMonths, subMonths, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isAfter, isBefore } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface CustomDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomDateRangePicker({
  value,
  onChange,
  placeholder = "Select Date Range",
  className,
}: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [leftMonth, setLeftMonth] = useState<Date>(value.start ? new Date(value.start) : new Date());
  
  // Right month is always the month after the left month
  const rightMonth = addMonths(leftMonth, 1);
  
  // Temporary selection state while picking
  const [tempSelection, setTempSelection] = useState<DateRange>({ start: value.start, end: value.end });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Sync temp state when opening
  useEffect(() => {
    if (isOpen) {
      setTempSelection({ start: value.start, end: value.end });
      if (value.start) {
        setLeftMonth(startOfMonth(new Date(value.start)));
      } else {
        setLeftMonth(startOfMonth(new Date()));
      }
    }
  }, [isOpen, value]);

  const updateDropdownPosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      
      // Attempt to right-align if it would overflow the screen on desktop
      let left = rect.left;
      const expectedWidth = isMobile ? Math.min(window.innerWidth - 32, 320) : 600;
      
      if (left + expectedWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - expectedWidth - 16);
      }

      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        left: `${left}px`,
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

  const handleDayClick = (day: Date) => {
    if (!tempSelection.start || (tempSelection.start && tempSelection.end)) {
      // Start a new selection
      setTempSelection({ start: day, end: null });
    } else if (tempSelection.start && !tempSelection.end) {
      // Complete the selection
      if (isBefore(day, tempSelection.start)) {
        // If clicking before start date, make the new date the start date
        setTempSelection({ start: day, end: tempSelection.start });
      } else {
        setTempSelection({ start: tempSelection.start, end: day });
      }
    }
  };

  const handleApply = () => {
    onChange(tempSelection);
    setIsOpen(false);
  };

  const generateMonthDays = (monthDate: Date) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });
    
    // Add empty slots for days before the 1st of the month
    const startDayOfWeek = getDay(start);
    const emptySlots = Array(startDayOfWeek).fill(null);
    
    return [...emptySlots, ...days];
  };

  const renderCalendar = (monthDate: Date) => {
    const days = generateMonthDays(monthDate);
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
      <div className="flex-1 w-full sm:w-[280px]">
        <div className="flex justify-between items-center mb-4 px-2">
          {isSameMonth(monthDate, leftMonth) ? (
             <button onClick={() => setLeftMonth(subMonths(leftMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
               <ChevronLeft size={18} />
             </button>
          ) : (
             <div className="w-[26px]"></div> // Spacer
          )}
          
          <div className="font-bold text-slate-800 text-[0.95rem]">
            {format(monthDate, "MMMM yyyy")}
          </div>

          {!isSameMonth(monthDate, leftMonth) ? (
             <button onClick={() => setLeftMonth(addMonths(leftMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
               <ChevronRight size={18} />
             </button>
          ) : (
             <div className="hidden sm:block w-[26px]"></div> // Spacer for desktop left cal
          )}
          
          {isSameMonth(monthDate, leftMonth) && (
            <div className="sm:hidden">
              <button onClick={() => setLeftMonth(addMonths(leftMonth, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold text-slate-400 mb-2">
          {weekDays.map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-8"></div>;

            const isStart = tempSelection.start && isSameDay(day, tempSelection.start);
            const isEnd = tempSelection.end && isSameDay(day, tempSelection.end);
            
            // Check if day is between start and end (or hover date)
            let isBetween = false;
            if (tempSelection.start && tempSelection.end) {
              isBetween = isAfter(day, tempSelection.start) && isBefore(day, tempSelection.end);
            } else if (tempSelection.start && !tempSelection.end && hoverDate) {
              if (isBefore(hoverDate, tempSelection.start)) {
                 isBetween = isAfter(day, hoverDate) && isBefore(day, tempSelection.start);
              } else {
                 isBetween = isAfter(day, tempSelection.start) && isBefore(day, hoverDate);
              }
            }

            const isSelected = isStart || isEnd;

            return (
              <div 
                key={day.toISOString()} 
                className="relative flex justify-center items-center h-8"
                onMouseEnter={() => setHoverDate(day)}
              >
                {/* Highlight Background */}
                {isBetween && (
                  <div className="absolute inset-0 bg-blue-50"></div>
                )}
                {isStart && tempSelection.end && (
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-blue-50"></div>
                )}
                {isEnd && tempSelection.start && (
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-50"></div>
                )}
                {isStart && !tempSelection.end && hoverDate && isAfter(hoverDate, day) && (
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-blue-50"></div>
                )}
                {isStart && !tempSelection.end && hoverDate && isBefore(hoverDate, day) && (
                   <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-50"></div>
                )}

                <button
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "relative w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium z-10 transition-colors",
                    isSelected ? "bg-blue-600 text-white font-bold shadow-sm hover:bg-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {format(day, 'd')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const displayText = value.start && value.end
    ? `${format(value.start, "dd MMM")} - ${format(value.end, "dd MMM")}`
    : placeholder;

  const dropdownContent = isOpen ? (
    <div 
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 p-4 flex flex-col animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex flex-col sm:flex-row gap-6">
        {renderCalendar(leftMonth)}
        <div className="hidden sm:block w-px bg-slate-100 self-stretch"></div>
        <div className="hidden sm:block">
           {renderCalendar(rightMonth)}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
         <div className="text-xs font-bold text-slate-500">
           {tempSelection.start ? format(tempSelection.start, "dd MMM yyyy") : "Start"} 
           {" - "} 
           {tempSelection.end ? format(tempSelection.end, "dd MMM yyyy") : "End"}
         </div>
         <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => {
                setTempSelection({ start: null, end: null });
              }}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear
            </button>
            <button 
              type="button"
              onClick={handleApply}
              disabled={!tempSelection.start || !tempSelection.end}
              className="px-6 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
         </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button 
        ref={buttonRef}
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-[45px] w-full items-center justify-between rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
          "border-slate-200 hover:border-slate-300",
          (!value.start || !value.end) && "text-slate-400",
          (value.start && value.end) && "text-slate-800 font-bold"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon size={16} className={cn("text-slate-400", (value.start && value.end) && "text-blue-500")} />
          <span className="truncate">{displayText}</span>
        </div>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        dropdownContent,
        document.body
      )}
    </div>
  );
}
