"use client";

import CalendarWidget from '@/components/dashboard/CalendarWidget';
import UpcomingShoots from '@/components/dashboard/UpcomingShoots';
import useSWR from 'swr';


import { useRouter } from 'next/navigation';
import OverdueBookingBanners from '@/components/bookings/OverdueBookingBanners';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function BookingsDataView() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR('/api/bookings/overview', fetcher);

  if (isLoading) return <BookingsSkeleton />;
  if (error || !data || data.error) return <div>Failed to load bookings data</div>;

  const { bookings, prefs, metrics } = data;
  const {
    immediateShoots,
    thisWeekShoots,
    pendingDueAmount,
    unconfirmedShoots,
    hotDates,
    albumInProgressCount,
    pendingAlbumWorksCount
  } = metrics;

  return (
    <>
      <OverdueBookingBanners />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
        <div onClick={() => router.push('/bookings/allBookings?filter=today_tomorrow')} className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-red-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
              <i className="ph-fill ph-fire text-[1.1rem]"></i>
            </div>
            {immediateShoots > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Urgent</span>}
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Today & Tomorrow</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{immediateShoots} <span className="text-[0.8rem] text-slate-400 font-semibold">shoots</span></div>
          </div>
        </div>
        
        <div onClick={() => router.push('/bookings/allBookings?filter=next_7_days')} className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <i className="ph-fill ph-calendar-blank text-[1.1rem]"></i>
            </div>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Pipeline</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Next 7 Days</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{thisWeekShoots} <span className="text-[0.8rem] text-slate-400 font-semibold">shoots</span></div>
          </div>
        </div>

        <div onClick={() => router.push('/bookings/allBookings?filter=hot_dates')} className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-5 border border-orange-200 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-300 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center shadow-sm group-hover:shadow-orange-500/30 transition-all">
              <i className="ph-fill ph-fire text-[1.1rem] animate-pulse origin-bottom" style={{ animationDuration: '1.5s' }}></i>
            </div>
            {(hotDates?.length || 0) > 0 && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">High Value</span>}
          </div>
          <div>
            <div className="text-orange-600/80 font-bold text-[0.75rem] mb-0.5">Hot Dates</div>
            <div className="text-[1.5rem] font-extrabold text-orange-600 leading-none tracking-tight">{hotDates?.length || 0} <span className="text-[0.8rem] text-orange-400/80 font-semibold">dates</span></div>
          </div>
        </div>

        <div onClick={() => router.push('/bookings/album-status?tab=Work+in+Progress')} className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-purple-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <i className="ph-fill ph-book-open text-[1.1rem]"></i>
            </div>
            {albumInProgressCount > 0 && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">In Progress</span>}
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Album In Progress</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{albumInProgressCount} <span className="text-[0.8rem] text-slate-400 font-semibold">albums</span></div>
          </div>
        </div>

        <div onClick={() => router.push('/bookings/album-status?tab=Pending')} className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-pink-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-colors">
              <i className="ph-fill ph-clock-countdown text-[1.1rem]"></i>
            </div>
            {pendingAlbumWorksCount > 0 && <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Pending</span>}
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Pending Album Works</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{pendingAlbumWorksCount} <span className="text-[0.8rem] text-slate-400 font-semibold">albums</span></div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <CalendarWidget />
        <div>
          <UpcomingShoots bookings={bookings} />
        </div>
      </div>
    </>
  );
}


import { Suspense } from "react";

function BookingsSkeleton() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white rounded-2xl h-[120px] border border-gray-100"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="bg-white rounded-2xl h-[500px]"></div>
        <div className="bg-white rounded-2xl h-[500px]"></div>
      </div>
    </div>
  );
}

export default function BookingsOverviewPage() {
  return (
    <section className="w-full max-w-[1400px] mx-auto animate-[fadeIn_0.4s_ease-out] pb-20">
      <Suspense fallback={<BookingsSkeleton />}>
        <BookingsDataView />
      </Suspense>
    </section>
  );
}
