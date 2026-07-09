import React from 'react';
import Link from 'next/link';

interface StatCardsProps {
  totalBookings: number;
  pendingRetouch: number;
  hotDatesCount: number;
  totalActiveOrders: number;
  showHotDates: boolean;
}

export default function StatCards({ totalBookings, pendingRetouch, hotDatesCount, totalActiveOrders, showHotDates }: StatCardsProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${showHotDates ? '4' : '3'} gap-4 mb-6`}>
      {/* Bookings Card */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col justify-between shadow-sm transition-all hover:shadow-md hover:border-emerald-100 relative group min-h-[110px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <i className="ph-bold ph-calendar-blank text-[1.1rem]"></i>
          </div>
          <span className="text-slate-500 font-semibold text-[0.8rem]">Bookings</span>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalBookings}</span>
        </div>
        <Link href="/bookings/allBookings" className="absolute bottom-4 right-4 text-[0.7rem] font-bold text-emerald-500 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          View all <i className="ph-bold ph-arrow-right"></i>
        </Link>
      </div>

      {/* Deliveries Due Card */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col justify-between shadow-sm transition-all hover:shadow-md hover:border-red-100 relative group min-h-[110px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
            <i className="ph-bold ph-package text-[1.1rem]"></i>
          </div>
          <span className="text-slate-500 font-semibold text-[0.8rem]">Deliveries Due</span>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{pendingRetouch}</span>
        </div>
        <Link href="/bookings/allBookings" className="absolute bottom-4 right-4 text-[0.7rem] font-bold text-red-500 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          View all <i className="ph-bold ph-arrow-right"></i>
        </Link>
      </div>

      {/* Hot Dates Card */}
      {showHotDates && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col justify-between shadow-sm transition-all hover:shadow-md hover:border-orange-100 relative group min-h-[110px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <i className="ph-bold ph-fire text-[1.1rem]"></i>
            </div>
            <span className="text-slate-500 font-semibold text-[0.8rem]">Hot Dates</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{hotDatesCount}</span>
          </div>
          <Link href="/bookings/allBookings" className="absolute bottom-4 right-4 text-[0.7rem] font-bold text-orange-500 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            View calendar <i className="ph-bold ph-arrow-right"></i>
          </Link>
        </div>
      )}

      {/* Gift Orders Card */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col justify-between shadow-sm transition-all hover:shadow-md hover:border-blue-100 relative group min-h-[110px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <i className="ph-bold ph-gift text-[1.1rem]"></i>
          </div>
          <span className="text-slate-500 font-semibold text-[0.8rem]">Gift Orders</span>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalActiveOrders}</span>
        </div>
        <Link href="/gifts" className="absolute bottom-4 right-4 text-[0.7rem] font-bold text-blue-500 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          View all <i className="ph-bold ph-arrow-right"></i>
        </Link>
      </div>
    </div>
  );
}
