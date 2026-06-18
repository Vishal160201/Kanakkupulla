"use client";

import { useEffect, useRef, useState } from "react";
import { useBookings } from "../providers/BookingProvider";
import MonthYearPicker from "../ui/MonthYearPicker";
import WeekPicker from "../ui/WeekPicker";
import DayPicker from "../ui/DayPicker";

export default function CalendarWidget() {
  const { bookings, setActiveDetailsId, setIsAddModalOpen, setSelectedDateForNew } = useBookings();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // June 2026 default
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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
  const getCategoryClass = (cat: string) => {
    if (cat === 'Fashion') return 'orange';
    if (cat === 'Wedding') return 'blue';
    if (cat === 'Corporate') return 'green';
    return '';
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
      
      const dayBookings = bookings.filter(b => b.date === dateString);
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      
      const handleCellClick = () => {
        setSelectedDateForNew(dateString);
        setIsAddModalOpen(true);
      };

      cells.push(
        <div key={i} className="calendar-cell interactive" style={{ cursor: 'pointer' }} onClick={handleCellClick}>
          {isToday ? (
            <div className="calendar-date" style={{ color: "var(--brand-orange)", fontWeight: 800 }}>{i} <span style={{ fontSize: "0.7rem", marginLeft: "5px" }}>Today</span></div>
          ) : (
            <div className="calendar-date" style={{ fontWeight: dayBookings.length > 0 ? 800 : 400 }}>{i}</div>
          )}
          
          {dayBookings.map(b => (
            <div key={b.id} className={`calendar-event ${getCategoryClass(b.category)}`} onClick={(e) => { e.stopPropagation(); setActiveDetailsId(b.id); }}>
              <i className="ph-fill ph-calendar-star"></i> {b.title.substring(0, 10)}...
            </div>
          ))}
        </div>
      );
    }

    return cells;
  };

  // Vertical layout logic
  const getVerticalEvents = (dateString: string) => {
    const dayBookings = bookings.filter(b => b.date === dateString);
    return dayBookings.map(b => {
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
        let bg = '#fef2eb', color = '#e65100'; // Default Orange
        if (b.category === 'Wedding') { bg = '#e8f0fe'; color = '#1a73e8'; } // Blue
        else if (b.category === 'Corporate') { bg = '#e6f4ea'; color = '#137333'; } // Green

        return (
          <div key={b.id} className="event-block" style={{ top: topOffset, height: 50, backgroundColor: bg, color }} onClick={(e) => { e.stopPropagation(); setActiveDetailsId(b.id); }}>
            <div className="event-block-title">{b.title}</div>
            <div className="event-block-time">{b.time}</div>
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
        setSelectedDateForNew(dateString);
        setIsAddModalOpen(true);
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
      setSelectedDateForNew(dateString);
      setIsAddModalOpen(true);
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
      
      <div id="calendar-container">
        {view === 'month' && (
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="calendar-day-header">{d}</div>)}
            {renderMonthGrid()}
          </div>
        )}
        {view === 'week' && <div className="calendar-time-grid">{renderWeekGrid()}</div>}
        {view === 'day' && <div className="calendar-time-grid">{renderDayGrid()}</div>}
      </div>
    </div>
  );
}
