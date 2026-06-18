"use client";

import { useState, useRef, useEffect } from 'react';

interface WeekPickerProps {
  currentDate: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function WeekPicker({ currentDate, onChange, onClose }: WeekPickerProps) {
  const [viewDate, setViewDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDayDate = new Date(year, month + 1, 0).getDate();
  const prevLastDayDate = new Date(year, month, 0).getDate();

  const currentWeekStart = new Date(currentDate);
  currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const currentWeekString = currentWeekStart.toDateString();

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
      className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[1000] w-[320px] p-4"
    >
      {/* Header */}
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
          const weekStart = week[0].date;
          const isSelectedWeek = weekStart.toDateString() === currentWeekString;

          return (
            <div 
              key={wIndex} 
              className={`flex cursor-pointer rounded-md transition-colors hover:bg-teal-50 ${isSelectedWeek ? 'bg-teal-100/50' : ''}`}
              onClick={() => {
                onChange(week[0].date);
              }}
            >
              {/* Days */}
              {week.map((day, dIndex) => {
                const isSelectedWeekStart = isSelectedWeek && dIndex === 0;
                const isSelectedWeekEnd = isSelectedWeek && dIndex === 6;
                const isEndpoint = isSelectedWeekStart || isSelectedWeekEnd;
                const isToday = day.date.toDateString() === new Date().toDateString();
                const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                
                return (
                  <div 
                    key={dIndex}
                    className={`flex-1 flex items-center justify-center py-1.5 border-[1.5px] border-white ${dIndex === 0 ? 'rounded-l-md' : dIndex === 6 ? 'rounded-r-md' : ''} ${day.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}`}
                  >
                    <div className={`w-[28px] h-[28px] flex items-center justify-center rounded-full ${isEndpoint ? 'bg-teal-500 text-white font-bold' : isToday ? 'bg-orange-500 text-white font-bold' : isWeekend ? 'text-red-400' : ''}`}>
                      {day.dayNum}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
