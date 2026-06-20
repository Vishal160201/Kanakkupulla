"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MonthYearPicker from "../ui/MonthYearPicker";
import WeekPicker from "../ui/WeekPicker";
import DayPicker from "../ui/DayPicker";
import { Booking } from "@/types";
import { useSystem } from "@/components/providers/SystemProvider";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function CalendarWidget() {
  const router = useRouter();
  const { preferences } = useSystem();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // June 2026 default
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [popupDate, setPopupDate] = useState<string | null>(null);

  // Calculate bounds
  let startDate = new Date(currentDate);
  let endDate = new Date(currentDate);
  if (view === 'month') {
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - 1); // fetch a bit of prev month
    endDate.setMonth(endDate.getMonth() + 2); // fetch a bit of next month
    endDate.setDate(0);
  } else if (view === 'week') {
    startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
    endDate.setDate(startDate.getDate() + 21);
  } else {
    startDate.setDate(startDate.getDate() - 2);
    endDate.setDate(endDate.getDate() + 2);
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const { data: dbBookings, isLoading } = useSWR(`/api/bookings?startDate=${startDateStr}&endDate=${endDateStr}`, fetcher);

  const bookings: Booking[] = (dbBookings || []).map((b: any) => ({
    id: b.id,
    bookingNumber: b.bookingNumber,
    title: b.client?.name || 'Unknown',
    category: b.category,
    date: new Date(b.date).toISOString().split('T')[0],
    time: b.time,
    location: b.location,
    package: b.order?.package?.toString() || '',
    status: b.status
  }));


  const nextRange = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else if (view === 'day') d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const prevRange = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else if (view === 'day') d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  // Helper to format category for rendering
  const getTierStyles = (pkgAmountStr: string | null | undefined) => {
    const pkgAmount = parseFloat(pkgAmountStr || "0");
    if (preferences?.calendarTiers) {
      for (const tier of preferences.calendarTiers) {
        if (pkgAmount <= tier.max) {
          return { bg: tier.bg, color: tier.text };
        }
      }
    }
    return { bg: '#ffedd5', color: '#ea580c' }; // fallback
  };

  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayDate = new Date(year, month + 1, 0).getDate();
    const prevLastDayDate = new Date(year, month, 0).getDate();
    const today = new Date();

    const cells = [];
    
    // Previous month filler days
    for (let i = firstDayIndex; i > 0; i--) {
      cells.push(
        <div key={`prev-${i}`} className="calendar-cell text-muted">
          <div className="calendar-date">{prevLastDayDate - i + 1}</div>
        </div>
      );
    }

    // Current month days
    for (let i = 1; i <= lastDayDate; i++) {
      const paddedMonth = String(month + 1).padStart(2, '0');
      const paddedDay = String(i).padStart(2, '0');
      const dateString = `${year}-${paddedMonth}-${paddedDay}`;
      
      const dayBookings = bookings.filter((b: Booking) => b.date === dateString);
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      
      const handleCellClick = () => {
        router.push(`/bookings/new?date=${dateString}`);
      };

      cells.push(
        <div key={i} className="calendar-cell interactive" style={{ cursor: 'pointer', position: 'relative' }} onClick={handleCellClick}>
          {isToday ? (
            <div className="calendar-date" style={{ color: "var(--brand-orange)", fontWeight: 800 }}>{i} <span style={{ fontSize: "0.7rem", marginLeft: "5px" }}>Today</span></div>
          ) : (
            <div className="calendar-date" style={{ fontWeight: dayBookings.length > 0 ? 800 : 400 }}>{i}</div>
          )}
          
          {dayBookings.slice(0, 2).map((b: Booking) => {
            const styles = getTierStyles(b.package);
            return (
              <div key={b.id} className="calendar-event" style={{ backgroundColor: styles.bg, color: styles.color, border: 'none', marginBottom: '2px', padding: '3px 6px', fontSize: '0.65rem', borderRadius: '6px' }} onClick={(e) => { e.stopPropagation(); router.push(`/bookings/details/${b.id}`); }}>
                <i className="ph-fill ph-calendar-star"></i> {b.title.substring(0, 10)}...
              </div>
            );
          })}

          {dayBookings.length > 2 && (
            <div 
              className="calendar-event-more" 
              style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', cursor: 'pointer', fontWeight: 800, padding: '2px', borderRadius: '4px', background: 'transparent', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
              onClick={(e) => { e.stopPropagation(); setPopupDate(popupDate === dateString ? null : dateString); }}
            >
              +{dayBookings.length - 2} more <i className="ph-bold ph-caret-down text-[0.5rem]"></i>
            </div>
          )}

          {popupDate === dateString && (
            <div className="absolute z-[100] bg-white shadow-2xl border border-gray-200 rounded-xl p-2.5 top-[70%] left-1/2 -translate-x-1/2 min-w-[160px]" style={{ width: 'max-content' }}>
              <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1 border-b border-gray-100 pb-1 flex justify-between items-center">
                <span>{new Date(dateString).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                <div 
                  className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 text-slate-500"
                  onClick={(e) => { e.stopPropagation(); setPopupDate(null); }}
                >
                  <i className="ph-bold ph-x text-[0.6rem]"></i>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                {dayBookings.map((b: Booking) => {
                  const styles = getTierStyles(b.package);
                  return (
                    <div 
                      key={b.id} 
                      className="px-2.5 py-1.5 rounded-lg text-[0.75rem] font-extrabold cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-sm" 
                      style={{ backgroundColor: styles.bg, color: styles.color }} 
                      onClick={(e) => { e.stopPropagation(); router.push(`/bookings/details/${b.id}`); setPopupDate(null); }}
                    >
                      <i className="ph-fill ph-calendar-star mr-1"></i> {b.title}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    return cells;
  };

  // Vertical layout logic
  const getVerticalEvents = (dateString: string) => {
    const dayBookings = bookings.filter((b: Booking) => b.date === dateString);
    return dayBookings.map((b: Booking) => {
      let startHour = 10;
      if (b.time) {
        const match = b.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1]);
          if (match[3].toUpperCase() === 'PM' && h < 12) h += 12;
          if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
          startHour = h;
        }
      }
      const topOffset = (startHour - 8) * 60;
      if (topOffset >= 0 && topOffset < 12 * 60) {
        const styles = getTierStyles(b.package);

        return (
          <div key={b.id} className="event-block" style={{ top: topOffset, height: 50, backgroundColor: styles.bg, color: styles.color, border: 'none', borderLeft: '3px solid rgba(0,0,0,0.1)' }} onClick={(e) => { e.stopPropagation(); router.push(`/bookings/details/${b.id}`); }}>
            <div className="event-block-title" style={{ fontWeight: 800 }}>{b.title}</div>
            <div className="event-block-time" style={{ opacity: 0.9 }}>{b.time}</div>
          </div>
        );
      }
      return null;
    });
  };

  const renderWeekGrid = () => {
    const firstDateOfWeek = new Date(currentDate);
    const dayOfWeek = firstDateOfWeek.getDay();
    firstDateOfWeek.setDate(firstDateOfWeek.getDate() - dayOfWeek);

    const timeAxis = Array.from({ length: 12 }).map((_, i) => {
      const h = i + 8;
      const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const ampm = h >= 12 ? 'PM' : 'AM';
      return <div key={h} className="time-slot-label">{displayH} {ampm}</div>;
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const columns = days.map((d, i) => {
      const loopDate = new Date(firstDateOfWeek);
      loopDate.setDate(loopDate.getDate() + i);
      const dateString = `${loopDate.getFullYear()}-${String(loopDate.getMonth() + 1).padStart(2, '0')}-${String(loopDate.getDate()).padStart(2, '0')}`;
      const isToday = loopDate.toDateString() === new Date().toDateString();

      const handleColClick = () => {
        router.push(`/bookings/new?date=${dateString}`);
      };

      return {
        header: <div key={d} className="schedule-header-cell" style={{ color: isToday ? "var(--brand-orange)" : "" }}>{d} {loopDate.getDate()}</div>,
        column: <div key={d} className="day-column" onClick={handleColClick}>{getVerticalEvents(dateString)}</div>
      };
    });

    return (
      <>
        <div className="time-axis">{timeAxis}</div>
        <div className="schedule-container">
          <div className="schedule-header week-columns">{columns.map(c => c.header)}</div>
          <div className="schedule-body week-columns">{columns.map(c => c.column)}</div>
        </div>
      </>
    );
  };

  const renderDayGrid = () => {
    const timeAxis = Array.from({ length: 12 }).map((_, i) => {
      const h = i + 8;
      const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const ampm = h >= 12 ? 'PM' : 'AM';
      return <div key={h} className="time-slot-label">{displayH} {ampm}</div>;
    });

    const loopDate = currentDate;
    const dateString = `${loopDate.getFullYear()}-${String(loopDate.getMonth() + 1).padStart(2, '0')}-${String(loopDate.getDate()).padStart(2, '0')}`;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[currentDate.getDay()];
    const isToday = currentDate.toDateString() === new Date().toDateString();

    const handleColClick = () => {
      router.push(`/bookings/new?date=${dateString}`);
    };

    return (
      <>
        <div className="time-axis">{timeAxis}</div>
        <div className="schedule-container">
          <div className="schedule-header">
            <div className="schedule-header-cell" style={{ color: isToday ? "var(--brand-orange)" : "" }}>{dayName}, {currentDate.toLocaleString('default', { month: 'short' })} {currentDate.getDate()}, {currentDate.getFullYear()}</div>
          </div>
          <div className="schedule-body" style={{ gridTemplateColumns: "1fr" }}>
            <div className="day-column" onClick={handleColClick}>{getVerticalEvents(dateString)}</div>
          </div>
        </div>
      </>
    );
  };

  // Header Text
  let headerText = "";
  if (view === 'month') {
    headerText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  } else if (view === 'day') {
    headerText = currentDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
  } else if (view === 'week') {
    const firstDateOfWeek = new Date(currentDate);
    firstDateOfWeek.setDate(firstDateOfWeek.getDate() - firstDateOfWeek.getDay());
    const lastDateOfWeek = new Date(firstDateOfWeek);
    lastDateOfWeek.setDate(lastDateOfWeek.getDate() + 6);
    headerText = `${firstDateOfWeek.toLocaleString('default', { month: 'short', day: 'numeric' })} – ${lastDateOfWeek.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header">
        <div className="calendar-title">
          <div style={{ position: "relative" }}>
            <div style={{ cursor: "pointer", display: "flex", alignItems: "center" }} title="Select Month & Year" onClick={() => setIsPickerOpen(!isPickerOpen)}>
              <span id="calendar-month-year-text">{headerText}</span>
            </div>
            {isPickerOpen && view === 'week' && (
              <WeekPicker 
                currentDate={currentDate} 
                onChange={(d) => { setCurrentDate(d); setIsPickerOpen(false); }} 
                onClose={() => setIsPickerOpen(false)} 
              />
            )}
            {isPickerOpen && view === 'day' && (
              <DayPicker 
                currentDate={currentDate} 
                onChange={(d) => { setCurrentDate(d); setIsPickerOpen(false); }} 
                onClose={() => setIsPickerOpen(false)} 
              />
            )}
            {isPickerOpen && view === 'month' && (
              <MonthYearPicker 
                currentDate={currentDate} 
                onChange={(d) => { setCurrentDate(d); setIsPickerOpen(false); }} 
                onClose={() => setIsPickerOpen(false)} 
              />
            )}
          </div>
          <div className="calendar-nav">
            <button onClick={prevRange}><i className="ph-bold ph-caret-left"></i></button>
            <button onClick={nextRange}><i className="ph-bold ph-caret-right"></i></button>
          </div>
        </div>
        <div className="view-toggle">
          <button className={`calendar-view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
          <button className={`calendar-view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
          <button className={`calendar-view-btn ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Day</button>
        </div>
      </div>
      
      <div id="calendar-container" className={isLoading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
        {view === 'month' && (
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="calendar-day-header">{d}</div>)}
            {renderMonthGrid()}
          </div>
        )}
        {view === 'week' && <div className="calendar-time-grid">{renderWeekGrid()}</div>}
        {view === 'day' && <div className="calendar-time-grid">{renderDayGrid()}</div>}
      </div>

      <div className="flex justify-end items-center gap-4 pt-4 px-2 mt-auto border-t border-gray-100">
        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mr-2">Package Value:</div>
        {preferences?.calendarTiers?.map((tier: any, index: number) => {
          const prevMax = index > 0 ? preferences.calendarTiers[index - 1].max : 0;
          let label = "";
          if (index === 0) label = `< ${tier.max / 1000}k`;
          else if (index === preferences.calendarTiers.length - 1) label = `${prevMax / 1000}k+`;
          else label = `${prevMax / 1000}k - ${tier.max / 1000}k`;

          return (
            <div key={index} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.bg }}></div>
              <span className="text-[0.7rem] font-semibold text-slate-500">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
