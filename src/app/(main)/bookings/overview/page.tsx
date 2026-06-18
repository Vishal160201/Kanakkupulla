"use client";

import CalendarWidget from '@/components/dashboard/CalendarWidget';
import UpcomingShoots from '@/components/dashboard/UpcomingShoots';

export default function BookingsOverviewPage() {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
              <i className="ph-fill ph-calendar-plus text-[1.1rem]"></i>
            </div>
            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">+12% vs LY</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Total Bookings (MoM)</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">124</div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center">
              <i className="ph-fill ph-camera text-[1.1rem]"></i>
            </div>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Active</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Upcoming Shoots (7d)</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">18</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <i className="ph-fill ph-clipboard-text text-[1.1rem]"></i>
            </div>
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Priority</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Pending Confirmations</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">7</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200 cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
              <i className="ph-fill ph-currency-dollar text-[1.1rem]"></i>
            </div>
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Projected</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Revenue Forecast</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">₹42,850</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        <CalendarWidget />
        <div>
          <UpcomingShoots />
        </div>
      </div>
    </>
  );
}
