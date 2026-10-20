"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";

interface DashboardAlert {
  id: string;
  title: string;
  message: string;
}

const DISMISS_PREFIX = 'dismissed_alert_';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

/** Alert ids dismissed within the last 24h (localStorage is client-only). */
function readActiveDismissals(): string[] {
  if (typeof window === 'undefined') return [];
  const dismissed: string[] = [];
  const now = Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(DISMISS_PREFIX)) {
      const val = localStorage.getItem(key);
      if (val && now - parseInt(val, 10) < DISMISS_TTL_MS) {
        dismissed.push(key.replace(DISMISS_PREFIX, ''));
      }
    }
  }
  return dismissed;
}

/** Removes dismissals older than the 24h TTL. */
function pruneExpiredDismissals() {
  const now = Date.now();
  const expired: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(DISMISS_PREFIX)) {
      const val = localStorage.getItem(key);
      if (val && !(now - parseInt(val, 10) < DISMISS_TTL_MS)) expired.push(key);
    }
  }
  expired.forEach((key) => localStorage.removeItem(key));
}

function markDismissed(id: string) {
  localStorage.setItem(`${DISMISS_PREFIX}${id}`, Date.now().toString());
}

const subscribeNoop = () => () => {};

export default function TaskAlerts() {
  const { data: rawAlerts } = useSWR<DashboardAlert[]>('/api/dashboard/alerts', fetcher);
  const { data: overviewData } = useSWR<{ unconfirmedBookingsCount?: number; pendingRetouch?: number }>('/api/dashboard/overview', fetcher);

  // false during SSR and hydration, true afterwards (dismissals live in localStorage).
  const isMounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(readActiveDismissals);

  // Clean up expired dismissals (24h TTL)
  useEffect(() => {
    pruneExpiredDismissals();
  }, []);

  const alerts = (rawAlerts || []).filter((a) => !dismissedAlerts.includes(a.id));
  const unconfirmedCount = overviewData?.unconfirmedBookingsCount || 0;
  const pendingRetouch = overviewData?.pendingRetouch || 0;

  const handleDismiss = (id: string) => {
    markDismissed(id);
    setDismissedAlerts(prev => [...prev, id]);
  };

  if (!isMounted || (alerts.length === 0 && unconfirmedCount === 0 && pendingRetouch === 0)) return null;

  return (
    <div className="bg-white rounded-[20px] p-5 md:p-6 border border-gray-100 shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
          <i className="ph-fill ph-bell-ringing text-[1.1rem]"></i>
        </div>
        <h3 className="text-[1.1rem] font-extrabold text-slate-900 tracking-tight">Smart Alerts & To-Dos</h3>
      </div>

      <div className="flex flex-col gap-3">
        {pendingRetouch > 0 && (
          <div className="bg-orange-50/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm border border-orange-100/50 transition-all hover:bg-orange-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                <i className="ph-bold ph-warning text-lg"></i>
              </div>
              <div>
                <p className="text-[0.95rem] font-bold text-slate-900">Deliverables Due</p>
                <p className="text-[0.8rem] font-medium text-slate-500">{pendingRetouch} gallery deliveries are pending</p>
              </div>
            </div>
            <Link href="/bookings/allBookings" className="shrink-0 px-4 py-1.5 rounded-lg border border-orange-200 text-orange-500 text-[0.75rem] font-bold hover:bg-orange-50 transition-colors">
              View All
            </Link>
          </div>
        )}

        {unconfirmedCount > 0 && (
          <div className="bg-blue-50/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm border border-blue-100/50 transition-all hover:bg-blue-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <i className="ph-bold ph-info text-lg"></i>
              </div>
              <div>
                <p className="text-[0.95rem] font-bold text-slate-900">Pending Bookings</p>
                <p className="text-[0.8rem] font-medium text-slate-500">{unconfirmedCount} bookings awaiting confirmation</p>
              </div>
            </div>
            <Link href="/bookings/allBookings" className="shrink-0 px-4 py-1.5 rounded-lg border border-blue-200 text-blue-500 text-[0.75rem] font-bold hover:bg-blue-50 transition-colors">
              View All
            </Link>
          </div>
        )}

        {alerts.map((alert) => (
          <div key={alert.id} className="bg-red-50/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm border border-red-100/50 transition-all hover:bg-red-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                <i className="ph-bold ph-warning-circle text-lg"></i>
              </div>
              <div>
                <p className="text-[0.95rem] font-bold text-slate-900 leading-tight">{alert.title}</p>
                <p className="text-[0.8rem] font-medium text-slate-500 mt-0.5">{alert.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(alert.id)}
              className="shrink-0 px-4 py-1.5 rounded-lg border border-red-200 text-red-500 text-[0.75rem] font-bold hover:bg-red-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
