"use client";

import { useBookings } from '../providers/BookingProvider';

export default function BookingTable() {
  const { bookings, filters, setActiveDetailsId } = useBookings();

  // Sort and filter logic
  const filteredBookings = bookings.filter(b => {
    if (filters.categories.length > 0 && !filters.categories.includes(b.category)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(b.status)) return false;
    if (filters.clientName && !b.title.toLowerCase().includes(filters.clientName.toLowerCase())) return false;
    if (filters.dateStart && b.date < filters.dateStart) return false;
    if (filters.dateEnd && b.date > filters.dateEnd) return false;
    return true;
  });

  const sorted = [...filteredBookings].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full">
        <div className="flex px-4 py-3 border-b border-gray-200 text-slate-500 font-extrabold text-[0.7rem] uppercase tracking-[1px]">
          <div className="flex-[2]">Client</div>
          <div className="flex-[1.5]">Category</div>
          <div className="flex-[1.5]">Date & Time</div>
          <div className="flex-[1.5]">Location</div>
          <div className="flex-[1]">Amount</div>
          <div className="flex-[1]">Status</div>
          <div className="w-[40px] text-center"><i className="ph-bold ph-gear text-[1.1rem]"></i></div>
        </div>
        
        <div id="dynamic-bookings-table" className="flex flex-col">
          {sorted.map(b => {
            const d = new Date(b.date);
            const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            let badgeClass = 'bg-slate-100 text-slate-600 border border-slate-200';
            if (b.category === 'Fashion') badgeClass = 'bg-green-50 text-green-700 border-none';
            
            let statusDotClass = 'bg-blue-500';
            let statusTextClass = 'text-blue-700';
            if (b.status === 'Confirmed') { statusDotClass = 'bg-emerald-500'; statusTextClass = 'text-emerald-700'; }
            else if (b.status === 'Pending') { statusDotClass = 'bg-red-500'; statusTextClass = 'text-red-700'; }
            else if (b.status === 'Partial') { statusDotClass = 'bg-orange-500'; statusTextClass = 'text-orange-700'; }

            return (
              <div key={b.id} className="flex items-center px-4 py-3.5 border-b border-gray-100 last:border-b-0 transition-colors hover:bg-slate-50 cursor-pointer" onClick={() => setActiveDetailsId(b.id)}>
                <div className="flex-[2] flex items-center gap-3">
                  <div className="w-[35px] h-[35px] rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[0.85rem] shrink-0">{b.title.charAt(0).toUpperCase()}</div>
                  <div className="flex flex-col justify-center">
                    <h4 className="font-extrabold text-[0.95rem] text-slate-900 leading-tight">{b.title}</h4>
                    <p className="font-bold text-[0.7rem] text-slate-500 tracking-[0.5px] uppercase">{b.id}</p>
                  </div>
                </div>
                <div className="flex-[1.5] flex items-center">
                  <span className={`px-2.5 py-1 rounded-xl text-[0.7rem] font-extrabold tracking-[0.5px] ${badgeClass}`}>{b.category}</span>
                </div>
                <div className="flex-[1.5] flex flex-col justify-center">
                  <h4 className="font-bold text-[0.9rem] text-slate-900 leading-tight">{displayDate}</h4>
                  <p className="font-semibold text-[0.75rem] text-slate-500">{b.time}</p>
                </div>
                <div className="flex-[1.5] flex items-center gap-1.5 font-semibold text-[0.85rem] text-slate-600">
                  <i className="ph-fill ph-map-pin text-slate-400"></i> <span className="truncate pr-4">{b.location || 'TBD'}</span>
                </div>
                <div className="flex-[1] flex items-center font-extrabold text-[0.9rem] text-slate-900">₹{b.package || '0.00'}</div>
                <div className="flex-[1] flex items-center">
                  <div className={`flex items-center gap-2 font-bold text-[0.85rem] ${statusTextClass}`}>
                    <div className={`w-2 h-2 rounded-full ${statusDotClass}`}></div> {b.status}
                  </div>
                </div>
                <div className="w-[40px] text-center text-slate-400 flex items-center justify-center hover:text-slate-900 transition-colors">
                  <i className="ph-bold ph-dots-three-vertical text-[1.2rem]"></i>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
