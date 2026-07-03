"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TimePickerInputProps {
  value: string; // HH:mm format
  onChange: (timeStr: string) => void;
  className?: string;
}

export default function TimePickerInput({ value, onChange, className }: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<{ top: number; left: number; width?: number }>({ top: 0, left: 0 });

  // Parse initial value (HH:mm)
  const parseTime = (time: string) => {
    if (!time) return { h: 12, m: 0, ap: 'PM' };
    const [hStr, mStr] = time.split(':');
    const h24 = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ap = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h: h12, m: m || 0, ap };
  };

  const [selected, setSelected] = useState(parseTime(value));

  useEffect(() => {
    setSelected(parseTime(value));
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        popupRef.current && !popupRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    
    function updatePosition() {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Check if there is enough space below, otherwise drop up
        const spaceBelow = window.innerHeight - rect.bottom;
        const popupHeight = 220; // approximate height
        
        if (spaceBelow < popupHeight && rect.top > popupHeight) {
          // Drop up
          setPopupStyle({
            top: rect.top - popupHeight - 8,
            left: rect.left,
          });
        } else {
          // Drop down
          setPopupStyle({
            top: rect.bottom + 8,
            left: rect.left,
          });
        }
      }
    }

    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      // Auto-scroll to selected time
      setTimeout(() => {
        if (hoursRef.current) {
          const activeItem = hoursRef.current.querySelector('.bg-orange-500');
          if (activeItem) activeItem.scrollIntoView({ block: 'center' });
        }
        if (minutesRef.current) {
          const activeItem = minutesRef.current.querySelector('.bg-orange-500');
          if (activeItem) activeItem.scrollIntoView({ block: 'center' });
        }
      }, 10);
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const handleApply = (newH: number, newM: number, newAp: string) => {
    setSelected({ h: newH, m: newM, ap: newAp });
    let h24 = newH;
    if (newAp === 'PM' && h24 < 12) h24 += 12;
    if (newAp === 'AM' && h24 === 12) h24 = 0;
    
    onChange(`${String(h24).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  const displayTime = `${String(selected.h).padStart(2, '0')}:${String(selected.m).padStart(2, '0')} ${selected.ap}`;

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div ref={containerRef} className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={className || `flex h-[45px] w-full items-center justify-between rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 active:scale-95 ${isOpen ? 'border-orange-300 ring-2 ring-orange-500/20' : 'border-gray-200'}`}
      >
        <span className="flex-1 text-slate-900 font-bold whitespace-nowrap truncate">{displayTime}</span>
        <i className={`ph-bold ph-clock text-[1.1rem] transition-colors duration-300 ${isOpen ? 'text-orange-500' : 'text-slate-400'}`}></i>
      </div>
      
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={popupRef}
          className="fixed bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-[9999] flex gap-2 w-[220px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: popupStyle.top, left: popupStyle.left }}
        >
          {/* Hours Column */}
          <div ref={hoursRef} className="flex-1 h-[200px] overflow-y-auto custom-scrollbar border-r border-gray-100 pr-1">
            {hours.map(h => (
              <div 
                key={`h-${h}`}
                onClick={() => handleApply(h, selected.m, selected.ap)}
                className={`py-2 px-3 text-center rounded-xl cursor-pointer text-sm font-bold transition-colors ${selected.h === h ? 'bg-orange-500 text-white' : 'hover:bg-orange-50 text-slate-700'}`}
              >
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Minutes Column */}
          <div ref={minutesRef} className="flex-1 h-[200px] overflow-y-auto custom-scrollbar border-r border-gray-100 pr-1">
            {minutes.map(m => (
              <div 
                key={`m-${m}`}
                onClick={() => handleApply(selected.h, m, selected.ap)}
                className={`py-2 px-3 text-center rounded-xl cursor-pointer text-sm font-bold transition-colors ${selected.m === m ? 'bg-orange-500 text-white' : 'hover:bg-orange-50 text-slate-700'}`}
              >
                {String(m).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* AM/PM Column */}
          <div className="flex-1 flex flex-col gap-2 justify-center">
            {['AM', 'PM'].map(ap => (
              <div 
                key={ap}
                onClick={() => handleApply(selected.h, selected.m, ap)}
                className={`py-3 px-2 text-center rounded-xl cursor-pointer text-sm font-bold transition-colors ${selected.ap === ap ? 'bg-orange-500 text-white' : 'hover:bg-orange-50 text-slate-700'}`}
              >
                {ap}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
