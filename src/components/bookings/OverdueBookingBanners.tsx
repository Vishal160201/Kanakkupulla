"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function OverdueBookingBanners() {
  const { data: bookings, mutate } = useSWR("/api/bookings/overdue", fetcher, {
    refreshInterval: 60000,
  });

  const [dismissed, setDismissed] = useState<Record<string, number>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Load dismissed state from localStorage on mount
    const loadDismissed = () => {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem("dismissed_bookings");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const now = Date.now();
            const valid: Record<string, number> = {};
            
            // Only keep items dismissed within the last 24h
            Object.entries(parsed).forEach(([id, timestamp]) => {
              if (now - (timestamp as number) < 24 * 60 * 60 * 1000) {
                valid[id] = timestamp as number;
              }
            });
            
            setDismissed(valid);
            window.localStorage.setItem("dismissed_bookings", JSON.stringify(valid));
          } catch (e) {
            console.error("Failed to parse dismissed bookings", e);
          }
        }
      }
    };
    loadDismissed();
  }, []);

  const handleDismiss = (id: string) => {
    const newDismissed = { ...dismissed, [id]: Date.now() };
    setDismissed(newDismissed);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem("dismissed_bookings", JSON.stringify(newDismissed));
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Shoot Completed" })
      });
      if (res.ok) {
        mutate();
        if (typeof window !== 'undefined') window.location.reload();
      } else {
        console.error("Failed to update status");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!bookings || bookings.length === 0) return null;

  const visibleBookings = bookings.filter((b: any) => !dismissed[b.id]);

  if (visibleBookings.length === 0) return null;

  const displayBookings = isExpanded ? visibleBookings : visibleBookings.slice(0, 5);

  return (
    <div className="flex flex-col gap-2 mb-6">
      {displayBookings.map((booking: any) => (
        <div 
          key={booking.id}
          className="bg-white border border-slate-100 border-l-[3px] border-l-orange-400 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in-up relative overflow-hidden"
        >
          {/* Decorative background element on the right */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-50/50 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <i className="ph-fill ph-camera text-orange-500 text-xl"></i>
              </div>
              <i className="ph-fill ph-sparkle text-orange-400 absolute -top-1 -right-1 text-sm animate-pulse"></i>
              <i className="ph-fill ph-star text-orange-300 absolute top-1 -left-1 text-[10px] animate-pulse" style={{ animationDelay: '0.5s' }}></i>
            </div>
            <div>
              <p className="text-[15px] font-bold text-slate-800">
                📸 {booking.client?.name}'s shoot on {format(new Date(booking.date), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto relative z-10">
            <button 
              onClick={() => handleDismiss(booking.id)}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-sm flex items-center gap-2"
            >
              <div className="bg-slate-100 rounded px-1 flex items-center justify-center">
                <i className="ph-bold ph-x text-[10px] text-slate-500"></i>
              </div>
              Dismiss
            </button>
            <button 
              onClick={() => handleComplete(booking.id)}
              className="px-5 py-2 text-[13px] font-bold text-white bg-[#F97316] hover:bg-orange-600 rounded-lg transition-all shadow-sm shadow-orange-500/20 flex items-center gap-2"
            >
              <i className="ph-bold ph-check"></i>
              Shoot Completed
            </button>
          </div>
        </div>
      ))}

      {visibleBookings.length > 5 && !isExpanded && (
        <button 
          onClick={() => setIsExpanded(true)} 
          className="flex items-center justify-center gap-2 text-[#D95F24] hover:text-orange-700 font-extrabold text-[13px] tracking-[0.15em] mt-2 py-4 w-full transition-colors uppercase animate-fade-in"
        >
          CLICK HERE TO VIEW ALL <i className="ph-bold ph-arrow-right text-[15px]"></i>
        </button>
      )}
    </div>
  );
}
