"use client";

import Link from 'next/link';
import type { Booking } from '@/types';
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";

/** Bookings may carry the raw client relation when title is missing. */
type UpcomingBooking = Booking & { client?: { name?: string | null } | null };

/** Start time from the booking, else from a time-like custom field. */
function getShootTime(b: UpcomingBooking): string | undefined {
  let t: unknown = b.time;
  if (!t && b.customData) {
    try {
      const raw: unknown = typeof b.customData === 'string' ? JSON.parse(b.customData) : b.customData;
      const parsed = (raw ?? {}) as Record<string, unknown>;
      t = parsed.fld_b_time || parsed.fld_b_start_time || parsed.startTime || parsed.time;

      if (!t) {
        // Fallback: search for any key containing 'time' that has a time-like value
        for (const key of Object.keys(parsed)) {
          const value = parsed[key];
          if (key.toLowerCase().includes('time') && typeof value === 'string' && value.includes(':')) {
            t = value;
            break;
          }
        }
      }
    } catch {}
  }
  return t ? (t as string) : undefined;
}

export default function UpcomingShoots({ bookings }: { bookings: UpcomingBooking[] }) {
  const { openBookingDetails } = useGlobalForm();

  // Parse dates carefully to avoid timezone issues
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfTodayMs = today.getTime();
  const startOfTomorrowMs = tomorrow.getTime();

  // Find bound for next week (7 days from tomorrow)
  const endOfNextWeekMs = startOfTomorrowMs + (7 * 24 * 60 * 60 * 1000);

  const grouped = bookings.reduce((acc, booking) => {
    const [year, month, day] = booking.date.split('-').map(Number);
    const bookingDate = new Date(year, month - 1, day);
    bookingDate.setHours(0, 0, 0, 0);
    const ms = bookingDate.getTime();

    if (ms === startOfTodayMs) {
      acc.today.push(booking);
    } else if (ms === startOfTomorrowMs) {
      acc.tomorrow.push(booking);
    } else if (ms > startOfTomorrowMs && ms <= endOfNextWeekMs) {
      acc.nextWeek.push(booking);
    }
    return acc;
  }, { today: [] as UpcomingBooking[], tomorrow: [] as UpcomingBooking[], nextWeek: [] as UpcomingBooking[] });

  // Sort ascending chronologically
  grouped.today.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  grouped.tomorrow.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  grouped.nextWeek.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Show at most 5 shoots in total, filling Today first, then Tomorrow, then Next 7 Days.
  const maxToShow = 5;
  const todayToShow = grouped.today.slice(0, maxToShow);
  const tomorrowToShow = grouped.tomorrow.slice(0, maxToShow - todayToShow.length);
  const nextWeekToShow = grouped.nextWeek.slice(0, maxToShow - todayToShow.length - tomorrowToShow.length);

  const hasMore = (grouped.today.length + grouped.tomorrow.length + grouped.nextWeek.length) > 0;

  const renderGroup = (title: string, groupBookings: UpcomingBooking[]) => {
    if (groupBookings.length === 0) return null;

    return (
      <div className="mb-7 last:mb-2 relative">
        <div className="flex items-center justify-between mb-4 pl-1">
          <h4 className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-[2px] flex items-center gap-2">
            {title}
            <span className="w-[18px] h-[18px] flex items-center justify-center bg-slate-100 text-slate-500 rounded-full text-[0.6rem] font-extrabold shadow-inner">
              {groupBookings.length}
            </span>
          </h4>
        </div>
        
        <div className="flex flex-col gap-3">
          {groupBookings.map(b => (
              <button
                type="button"
                key={b.id}
                className="group relative w-full text-left flex items-center justify-between bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl p-4 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:bg-white"
                onClick={() => openBookingDetails(b.id)}
              >
                {/* Modern subtle background glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/0 to-orange-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {title === "Today" && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.4)]"></div>
                )}
                
                <div className="flex items-center gap-4 relative z-10 min-w-0 flex-1">
                  <div className={`w-[48px] h-[42px] shrink-0 rounded-xl flex flex-col items-center justify-center shadow-sm transition-all duration-300 ${
                    title === "Today" 
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-500/20 group-hover:shadow-orange-500/40' 
                      : 'bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 group-hover:from-orange-50 group-hover:to-orange-100 group-hover:text-orange-600'
                  }`}>
                    {(() => {
                      const t = getShootTime(b);

                      return t ? (
                        <>
                          <span className="text-[0.8rem] font-black leading-none">{t.split(' ')[0]}</span>
                          {t.split(' ')[1] && (
                            <span className="text-[0.55rem] font-bold uppercase mt-0.5 opacity-90">{t.split(' ')[1]}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[1.1rem] font-black">
                          {(b.title || b.client?.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      );
                    })()}
                  </div>
                  
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <h4 className="font-extrabold text-[0.95rem] text-slate-800 leading-tight group-hover:text-orange-600 transition-colors truncate">{b.title || b.client?.name || 'Untitled'}</h4>
                    <span className="font-semibold text-[0.65rem] text-slate-400 uppercase tracking-widest mt-0.5 group-hover:text-slate-500 transition-colors">
                      {b.bookingNumber || b.id.substring(0, 8)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end relative z-10 shrink-0 ml-3">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg whitespace-nowrap text-[0.65rem] font-bold uppercase tracking-wider mb-1.5 backdrop-blur-sm ${
                    b.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 
                    b.status === 'Pending' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      b.status === 'Confirmed' ? 'bg-emerald-500' : 
                      b.status === 'Pending' ? 'bg-red-500' : 'bg-orange-500'
                    }`}></div>
                    {b.status}
                  </div>
                  <span className="text-[0.75rem] font-black text-slate-600">
                    {new Date(b.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                  </span>
                </div>
              </button>
            ))}
          </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Decorative subtle background elements */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.06),transparent_60%)]"></div>
      
      <div className="flex justify-between items-center mb-8 relative z-10">
        <h3 className="text-[1.3rem] font-black text-slate-900 tracking-tight flex items-center gap-2">
          Upcoming Shoots
        </h3>
      </div>
      
      <div className="relative z-10 flex-1">
        {renderGroup("Today", todayToShow)}
        {renderGroup("Tomorrow", tomorrowToShow)}
        {renderGroup("Next 7 Days", nextWeekToShow)}
        
        {!hasMore && (
          <div className="bg-white/40 border border-dashed border-slate-200 rounded-2xl p-6 text-center backdrop-blur-sm">
             <i className="ph ph-calendar-x text-3xl text-slate-300 mb-2"></i>
             <p className="text-sm font-bold text-slate-400">No upcoming shoots</p>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 pt-4 text-center relative z-10 border-t border-slate-100">
          <Link 
            href="/bookings/upcoming" 
            className="text-[0.8rem] font-black text-orange-500 uppercase tracking-widest hover:text-orange-600 transition-colors inline-flex items-center gap-2"
          >
            Click here to view all <i className="ph-bold ph-arrow-right"></i>
          </Link>
        </div>
      )}
    </div>
  );
}
