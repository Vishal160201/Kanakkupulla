"use client";

import { useState, useRef, useEffect } from 'react';

interface DayPickerProps {
  currentDate: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  mode?: 'day' | 'week' | 'month';
  align?: 'left' | 'right';
}

export default function DayPicker({ currentDate, onChange, onClose, mode = 'day', align = 'left' }: DayPickerProps) {
  const [viewDate, setViewDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const containerRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        setPlacement('top');
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDayDate = new Date(year, month + 1, 0).getDate();
  const prevLastDayDate = new Date(year, month, 0).getDate();

  const weeks: {date: Date, isCurrentMonth: boolean, dayNum: number}[][] = [];
  let currentWeekDays: {date: Date, isCurrentMonth: boolean, dayNum: number}[] = [];
  
  for (let i = firstDayIndex; i > 0; i--) {
    currentWeekDays.push({
      date: new Date(year, month, 1 - i),
      isCurrentMonth: false,
      dayNum: prevLastDayDate - i + 1
    });
  }

  for (let i = 1; i <= lastDayDate; i++) {
    currentWeekDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
      dayNum: i
    });
    if (currentWeekDays.length === 7) {
      weeks.push(currentWeekDays);
      currentWeekDays = [];
    }
  }

  if (currentWeekDays.length > 0) {
    let nextDay = 1;
    while (currentWeekDays.length < 7) {
      currentWeekDays.push({
        date: new Date(year, month + 1, nextDay++),
        isCurrentMonth: false,
        dayNum: nextDay - 1
      });
    }
    weeks.push(currentWeekDays);
  }

  const navYear = (offset: number) => setViewDate(new Date(year + offset, month, 1));
  const navMonth = (offset: number) => setViewDate(new Date(year, month + offset, 1));

  return (
    <div 
      ref={containerRef}
      className={`absolute ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'right' ? 'right-0' : 'left-0'} bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-[1000] w-[320px] p-5`}
    >
      {mode === 'month' ? (
        <>
          {/* Month Mode Header */}
          <div className="flex justify-between items-center mb-6 px-2">
            <button onClick={() => navYear(-1)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1">
              <i className="ph-bold ph-caret-left text-[1.1rem]"></i>
            </button>
            <div className="font-extrabold text-[1.1rem] text-slate-900">
              {year}
            </div>
            <button onClick={() => navYear(1)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1">
              <i className="ph-bold ph-caret-right text-[1.1rem]"></i>
            </button>
          </div>
          
          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-y-6 gap-x-2 pb-2">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => {
              const isSelected = currentDate.getMonth() === idx && currentDate.getFullYear() === year;
              return (
                <div key={m} className="flex justify-center">
                  <div 
                    onClick={() => {
                      onChange(new Date(year, idx, 1));
                      onClose();
                    }}
                    className={`flex items-center justify-center w-[60px] h-[60px] rounded-full cursor-pointer text-[1rem] transition-colors ${isSelected ? 'bg-[#8abeb0] text-white font-bold' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {m}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Day/Week Mode Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-1.5">
          <button onClick={() => navYear(-1)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors">
            <i className="ph-bold ph-caret-double-left text-[1.1rem]"></i>
          </button>
          <button onClick={() => navMonth(-1)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors">
            <i className="ph-bold ph-caret-left text-[1.1rem]"></i>
          </button>
        </div>
        
        <div className="font-bold text-[1rem] text-slate-900">
          {viewDate.toLocaleString('default', { month: 'short' })} {year}
        </div>

        <div className="flex gap-1.5">
          <button onClick={() => navMonth(1)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors">
            <i className="ph-bold ph-caret-right text-[1.1rem]"></i>
          </button>
          <button onClick={() => navYear(1)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors">
            <i className="ph-bold ph-caret-double-right text-[1.1rem]"></i>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col text-[0.85rem]">
        {/* Days Header */}
        <div className="flex text-center text-slate-500 font-semibold pb-2.5">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className="flex-1">{d}</div>
          ))}
        </div>

          {/* Weeks */}
          {weeks.map((week, wIndex) => {
            const isWeekSelected = mode === 'week' && week.some(d => {
              const start = new Date(currentDate);
              start.setDate(currentDate.getDate() - currentDate.getDay());
              const end = new Date(start);
              end.setDate(start.getDate() + 6);
              return d.date >= start && d.date <= end;
            });

            return (
              <div 
                key={wIndex} 
                className={`flex rounded-lg transition-colors ${mode === 'week' ? 'cursor-pointer hover:bg-indigo-50/50' : ''} ${isWeekSelected ? 'bg-indigo-50' : ''}`}
                onClick={() => {
                  if (mode === 'week') {
                    onChange(week[0].date); // Pass start of week
                    onClose();
                  }
                }}
              >
                {/* Days */}
                {week.map((day, dIndex) => {
                  const isSelectedDate = mode === 'day' && day.date.toDateString() === currentDate.toDateString();
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                  
                  return (
                    <div 
                      key={dIndex}
                      className={`flex-1 flex items-center justify-center py-1.5 ${mode === 'day' ? 'cursor-pointer hover:bg-indigo-50' : ''} rounded-lg transition-colors ${day.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}`}
                      onClick={() => {
                        if (mode === 'day') {
                          onChange(day.date);
                          onClose();
                        }
                      }}
                    >
                      <div className={`w-[32px] h-[32px] flex items-center justify-center rounded-full ${isSelectedDate ? 'bg-indigo-500 text-white font-bold' : isWeekSelected && mode === 'week' ? 'font-bold text-indigo-700' : isToday ? 'text-orange-500 font-bold' : isWeekend ? 'text-red-400 font-bold' : 'font-bold'}`}>
                        {day.dayNum}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
