"use client";

import Link from 'next/link';
import { useBookings } from '../providers/BookingProvider';

export default function UpcomingShoots() {
  const { bookings, setActiveDetailsId } = useBookings();
  const upcomingBookings = bookings.slice(0, 2); // Show the first two for demonstration

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[1.2rem] font-extrabold text-slate-900 tracking-tight">Upcoming Shoots</h3>
        <Link href="/bookings/allBookings" className="text-[0.75rem] font-bold text-orange-500 uppercase tracking-[1px] hover:text-orange-600 transition-colors">View All</Link>
      </div>
      
      {upcomingBookings.map(b => {
        const isFashion = b.category.toUpperCase() === 'FASHION';
        const badgeClasses = isFashion 
          ? "bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-[0.65rem] font-extrabold" 
          : "bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[0.65rem] font-extrabold"; 

        return (
          <div 
            key={b.id} 
            className="bg-white border border-gray-200 rounded-[16px] p-4 mb-4 shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300"
            onClick={() => setActiveDetailsId(b.id)}
          >
            
            {/* Header: Badge & ID */}
            <div className="flex justify-between items-center mb-3">
              <span className={badgeClasses}>{b.category.toUpperCase()}</span>
              <span className="text-[0.75rem] font-bold text-slate-500">ID: {b.id}</span>
            </div>
            
            {/* Title */}
            <div className="text-[1.1rem] font-extrabold text-slate-900 mb-3 leading-tight">{b.title}</div>
            
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-4 text-[0.8rem] text-slate-500 font-medium">
              <div className="flex items-center gap-2"><i className="ph-fill ph-clock text-[1rem]"></i> {new Date(b.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} - {b.time}</div>
              <div className="flex items-center gap-2"><i className="ph-fill ph-map-pin text-[1rem]"></i> {b.location || 'TBD'}</div>
              {b.phone && <div className="flex items-center gap-2"><i className="ph-fill ph-phone text-[1rem]"></i> {b.phone}</div>}
              {b.email && <div className="flex items-center gap-2 text-ellipsis overflow-hidden whitespace-nowrap"><i className="ph-fill ph-envelope text-[1rem]"></i> {b.email}</div>}
            </div>

            {/* Financials (if package is present) */}
            {b.package && (
              <div className="flex justify-between bg-stone-50 rounded-xl p-3 mb-4 border border-slate-100">
                <div>
                  <div className="text-[0.65rem] font-extrabold text-slate-500 mb-1 tracking-[0.5px]">PACKAGE</div>
                  <div className="font-extrabold text-slate-900 text-[0.9rem]">₹{b.package}</div>
                </div>
                <div>
                  <div className="text-[0.65rem] font-extrabold text-slate-500 mb-1 tracking-[0.5px]">ADVANCE</div>
                  <div className="font-extrabold text-slate-900 text-[0.9rem]">₹{b.advance || '0'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[0.65rem] font-extrabold text-slate-500 mb-1 tracking-[0.5px]">DUE</div>
                  <div className="font-extrabold text-slate-900 text-[0.9rem]">₹{b.due || '0'}</div>
                </div>
              </div>
            )}

            {/* Footer: Avatars & Status */}
            <div className="flex justify-between items-center">
              <div className="flex -space-x-2">
                <div className="w-[24px] h-[24px] rounded-full bg-slate-900 text-white flex items-center justify-center text-[0.7rem] font-bold border-2 border-white z-10">{b.title.charAt(0).toUpperCase()}</div>
                <div className="w-[24px] h-[24px] rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[0.9rem] border-2 border-white z-0"><i className="ph-fill ph-user"></i></div>
              </div>
              <div className={`flex items-center gap-1.5 text-[0.8rem] font-bold ${b.status === 'Confirmed' ? 'text-emerald-500' : (b.status === 'Pending' ? 'text-red-500' : 'text-amber-500')}`}>
                <div className={`w-2 h-2 rounded-full ${b.status === 'Confirmed' ? 'bg-emerald-500' : (b.status === 'Pending' ? 'bg-red-500' : 'bg-amber-500')}`}></div>
                {b.status}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
