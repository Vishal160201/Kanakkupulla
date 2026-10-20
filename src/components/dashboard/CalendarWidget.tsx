"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MonthYearPicker from "../ui/MonthYearPicker";
import WeekPicker from "../ui/WeekPicker";
import DayPicker from "../ui/DayPicker";
import type { Booking } from "@/types";
import { useSystem } from "@/components/providers/SystemProvider";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Suspense } from "react";
import { Tooltip } from "@/components/ui/Tooltip";

/** Booking row as returned by GET /api/bookings (only the fields used here). */
interface ApiBooking {
  id: string;
  bookingNumber?: string | null;
  client?: { name?: string | null } | null;
  category: string;
  date: string;
  time: string;
  location: string;
  order?: { package?: number | null } | null;
  status: string;
}

type CalendarBooking = Pick<Booking, 'id' | 'bookingNumber' | 'title' | 'category' | 'date' | 'time' | 'location' | 'package' | 'status'>;

const parseDateParam = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
};

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 8 AM – 7 PM hour labels for the week/day schedule views. */
function TimeAxis() {
  return (
    <div className="time-axis">
      {Array.from({ length: 12 }).map((_, i) => {
        const h = i + 8;
        const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const ampm = h >= 12 ? 'PM' : 'AM';
        return <div key={h} className="time-slot-label">{displayH} {ampm}</div>;
      })}
    </div>
  );
}

function CalendarWidgetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences } = useSystem();
  const { openBookingForm, openBookingDetails } = useGlobalForm();
  
  const [currentDate, setCurrentDate] = useState(() => {
    const d = searchParams.get('date');
    return d ? parseDateParam(d) : new Date();
  });

  // Jump to ?date= whenever the URL changes (adjusted during render rather than in an effect).
  const [syncedSearchParams, setSyncedSearchParams] = useState(searchParams);
  if (syncedSearchParams !== searchParams) {
    setSyncedSearchParams(searchParams);
    const d = searchParams.get('date');
    if (d) setCurrentDate(parseDateParam(d));
  }

  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [popupDate, setPopupDate] = useState<string | null>(null);

  // Calculate bounds
  const startDate = new Date(currentDate);
  const endDate = new Date(currentDate);
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

  const { data: dbBookings, isLoading } = useSWR<{ items?: ApiBooking[] }>(`/api/bookings?startDate=${startDateStr}&endDate=${endDateStr}`, fetcher);

  const bookings: CalendarBooking[] = (dbBookings?.items || []).map((b) => ({
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

  // Step the visible month / week / day forwards (1) or backwards (-1).
  const shiftRange = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else if (view === 'day') d.setDate(d.getDate() + dir);
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
      
      const dayBookings = bookings.filter((b: CalendarBooking) => b.date === dateString);
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      
      const handleCellClick = () => {
        openBookingForm(undefined, dateString);
      };

      cells.push(
        <div key={i} className="calendar-cell interactive" style={{ cursor: 'pointer', position: 'relative' }} onClick={handleCellClick}>
          {isToday ? (
            <div className="calendar-date" style={{ color: "var(--brand-orange)", fontWeight: 800 }}>{i} <span style={{ fontSize: "0.7rem", marginLeft: "5px" }}>Today</span></div>
          ) : (
            <div className="calendar-date" style={{ fontWeight: dayBookings.length > 0 ? 800 : 400 }}>{i}</div>
          )}
          
          {dayBookings.slice(0, 2).map((b: CalendarBooking) => {
            const styles = getTierStyles(b.package);
            return (
              <button type="button" key={b.id} className="calendar-event w-full text-left" style={{ backgroundColor: styles.bg, color: styles.color, border: 'none', marginBottom: '2px', padding: '3px 6px', fontSize: '0.65rem', borderRadius: '6px' }} onClick={(e) => { e.stopPropagation(); openBookingDetails(b.id); }}>
                <i className="ph-fill ph-calendar-star"></i> {b.title.substring(0, 10)}...
              </button>
            );
          })}

          {dayBookings.length > 2 && (
            <button
              type="button"
              className="calendar-event-more w-full"
              aria-expanded={popupDate === dateString}
              style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', cursor: 'pointer', fontWeight: 800, padding: '2px', borderRadius: '4px', background: 'transparent', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
              onClick={(e) => { e.stopPropagation(); setPopupDate(popupDate === dateString ? null : dateString); }}
            >
              +{dayBookings.length - 2} more <i className="ph-bold ph-caret-down text-[0.5rem]"></i>
            </button>
          )}

          {popupDate === dateString && (
            <div className="absolute z-[100] bg-white shadow-2xl border border-gray-200 rounded-xl p-2.5 top-[70%] left-1/2 -translate-x-1/2 min-w-[160px]" style={{ width: 'max-content' }}>
              <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1 border-b border-gray-100 pb-1 flex justify-between items-center">
                <span>{new Date(dateString).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                <button
                  type="button"
                  aria-label="Close"
                  className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 text-slate-500"
                  onClick={(e) => { e.stopPropagation(); setPopupDate(null); }}
                >
                  <i className="ph-bold ph-x text-[0.6rem]"></i>
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                {dayBookings.map((b: CalendarBooking) => {
                  return (
                    <button
                      type="button"
                      key={b.id}
                      className="block w-full text-left p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden"
                      onClick={(e) => { e.stopPropagation(); openBookingDetails(b.id); setPopupDate(null); }}
                    >
                      <i className="ph-fill ph-calendar-star mr-1"></i> {b.title}
                    </button>
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
    const dayBookings = bookings.filter((b: CalendarBooking) => b.date === dateString);
    return dayBookings.map((b: CalendarBooking) => {
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
          <div key={b.id} role="button" tabIndex={0} className="event-block" style={{ top: topOffset, height: 50, backgroundColor: styles.bg, color: styles.color, border: 'none', borderLeft: '3px solid rgba(0,0,0,0.1)' }} onClick={(e) => { e.stopPropagation(); openBookingDetails(b.id); }} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openBookingDetails(b.id); } }}>
            <div className="event-title"><i className="ph-fill ph-calendar-star mr-1"></i> {b.title}</div>
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

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const columns = days.map((d, i) => {
      const loopDate = new Date(firstDateOfWeek);
      loopDate.setDate(loopDate.getDate() + i);
      const dateString = toDateKey(loopDate);
      const isToday = loopDate.toDateString() === new Date().toDateString();

      const handleColClick = () => {
        openBookingForm(undefined, dateString);
      };

      return {
        header: <div key={d} className="schedule-header-cell" style={{ color: isToday ? "var(--brand-orange)" : "" }}>{d} {loopDate.getDate()}</div>,
        column: <div key={d} className="day-column" onClick={handleColClick}>{getVerticalEvents(dateString)}</div>
      };
    });

    return (
      <>
        <TimeAxis />
        <div className="schedule-container">
          <div className="schedule-header week-columns">{columns.map(c => c.header)}</div>
          <div className="schedule-body week-columns">{columns.map(c => c.column)}</div>
        </div>
      </>
    );
  };

  const renderDayGrid = () => {
    const dateString = toDateKey(currentDate);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[currentDate.getDay()];
    const isToday = currentDate.toDateString() === new Date().toDateString();

    const handleColClick = () => {
      router.push(`/bookings/new?date=${dateString}`);
    };

    return (
      <>
        <TimeAxis />
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

  const pickerProps = {
    currentDate,
    onChange: (d: Date) => { setCurrentDate(d); setIsPickerOpen(false); },
    onClose: () => setIsPickerOpen(false),
  };

  return (
    <div className="calendar-wrapper overflow-x-auto no-scrollbar">
      <div className="calendar-header flex-col sm:flex-row gap-4 sm:gap-0">
        <div className="calendar-title">
          <div style={{ position: "relative" }}>
            <Tooltip content="Select month & year">
              <button type="button" style={{ cursor: "pointer", display: "flex", alignItems: "center" }} aria-expanded={isPickerOpen} onClick={() => setIsPickerOpen(!isPickerOpen)}>
                <span id="calendar-month-year-text">{headerText}</span>
              </button>
            </Tooltip>
            {isPickerOpen && view === 'week' && <WeekPicker {...pickerProps} />}
            {isPickerOpen && view === 'day' && <DayPicker {...pickerProps} />}
            {isPickerOpen && view === 'month' && <MonthYearPicker {...pickerProps} />}
          </div>
          <div className="calendar-nav">
            <button type="button" aria-label="Previous" onClick={() => shiftRange(-1)}><i className="ph-bold ph-caret-left"></i></button>
            <button type="button" aria-label="Next" onClick={() => shiftRange(1)}><i className="ph-bold ph-caret-right"></i></button>
          </div>
        </div>
        <div className="view-toggle">
          <button type="button" className={`calendar-view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
          <button type="button" className={`calendar-view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
          <button type="button" className={`calendar-view-btn ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Day</button>
        </div>
      </div>
      
      <div id="calendar-container" className={isLoading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
        {view === 'month' && (
          <div className="calendar-grid min-w-[500px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="calendar-day-header">{d}</div>)}
            {renderMonthGrid()}
          </div>
        )}
        {view === 'week' && <div className="calendar-time-grid">{renderWeekGrid()}</div>}
        {view === 'day' && <div className="calendar-time-grid">{renderDayGrid()}</div>}
      </div>

      <div className="flex justify-start sm:justify-end flex-wrap items-center gap-2 sm:gap-4 pt-4 px-2 mt-auto border-t border-gray-100">
        <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mr-0 sm:mr-2 w-full sm:w-auto">Package Value:</div>
        {preferences?.calendarTiers?.map((tier, index) => {
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

export default function CalendarWidget() {
  return (
    <Suspense fallback={<div>Loading Calendar...</div>}>
      <CalendarWidgetInner />
    </Suspense>
  );
}
