"use client";

import { Booking } from "@/types";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useRouter } from "next/navigation";

export default function UpcomingShootFeed({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const { openBookingDetails } = useGlobalForm();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <i className="ph-fill ph-calendar-check text-2xl"></i>
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Upcoming Shoots</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">You have no scheduled shoots from today onwards. Enjoy your free time or schedule a new one!</p>
      </div>
    );
  }

  // Group by "Today", "Tomorrow", "Next 7 Days", "Later"
  const grouped = bookings.reduce((acc, booking) => {
    // Manually parse ISO string to avoid timezone shifts:
    const [year, month, day] = booking.date.split('-').map(Number);
    const bookingDate = new Date(year, month - 1, day);
    bookingDate.setHours(0, 0, 0, 0);
    
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.floor((bookingDate.getTime() - today.getTime()) / msPerDay);
    
    let group = "Later";
    if (diff === 0) group = "Today";
    else if (diff === 1) group = "Tomorrow";
    else if (diff <= 7) group = "Next 7 Days";
    else if (diff <= 30) group = "Next 30 Days";
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  // Sort shoots within each group by package amount (High to Low)
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      const pkgA = parseFloat(a.package || "0");
      const pkgB = parseFloat(b.package || "0");
      return pkgB - pkgA;
    });
  });

  const groupOrder = ["Today", "Tomorrow", "Next 7 Days", "Next 30 Days", "Later"];

  return (
    <div className="flex flex-col gap-8">
      {groupOrder.map(group => {
        const groupBookings = grouped[group];
        if (!groupBookings || groupBookings.length === 0) return null;

        return (
          <div key={group} className="animate-fade-in">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3">
              {group}
              <div className="h-[1px] bg-gray-200 flex-1"></div>
              <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full text-[0.7rem]">{groupBookings.length}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupBookings.map(booking => (
                <ShootCard key={booking.id} booking={booking} openBookingDetails={openBookingDetails} group={group} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShootCard({ booking, openBookingDetails, group }: { booking: Booking, openBookingDetails: (id: string) => void, group: string }) {
  const isToday = group === "Today";
  const pkgAmount = parseFloat(booking.package || "0");
  const advanceAmount = parseFloat(booking.advance || "0");
  const dueAmount = parseFloat(booking.due || "0");
  const hasDue = dueAmount > 0;
  
  const isPremium = pkgAmount >= 50000;
  const isMid = pkgAmount >= 30000 && pkgAmount < 50000;
  const isStandard = pkgAmount >= 20000 && pkgAmount < 30000;
  
  let tierClasses = "border-gray-100 hover:border-orange-200";
  let dateBoxClasses = "bg-slate-50 text-slate-700";
  let accentBar = "bg-orange-500";
  let bgClass = "bg-white";
  
  if (isPremium) {
    tierClasses = "border-yellow-200 hover:border-yellow-400 hover:shadow-yellow-100";
    dateBoxClasses = "bg-yellow-50 text-yellow-800 border border-yellow-100";
    accentBar = "bg-gradient-to-b from-yellow-400 to-yellow-600";
    bgClass = "bg-gradient-to-br from-white to-yellow-50/30";
  } else if (isMid) {
    tierClasses = "border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-50";
    dateBoxClasses = "bg-indigo-50 text-indigo-700";
    accentBar = "bg-indigo-400";
  } else if (isStandard) {
    tierClasses = "border-sky-100 hover:border-sky-300 hover:shadow-sky-50";
    dateBoxClasses = "bg-sky-50 text-sky-700";
    accentBar = "bg-sky-400";
  } else if (isToday) {
    tierClasses = "border-orange-200 ring-1 ring-orange-100";
  } else {
    if (isToday) {
      dateBoxClasses = "bg-orange-500 text-white shadow-md shadow-orange-200";
    }
  }

  const [year, month, day] = booking.date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const monthStr = dateObj.toLocaleString('default', { month: 'short' });
  const dayStr = dateObj.getDate().toString().padStart(2, '0');
  
  const progressPct = pkgAmount > 0 ? Math.round((advanceAmount / pkgAmount) * 100) : 0;

  return (
    <div 
      className={`rounded-2xl p-5 border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col gap-4 relative overflow-hidden group ${tierClasses} ${bgClass}`}
      onClick={() => openBookingDetails(booking.id)}
    >
      {/* Accent Bar indicating tier or Today */}
      {(isToday || isPremium || isMid || isStandard) && (
        <div className={`absolute top-0 left-0 w-1.5 h-full ${accentBar}`}></div>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-start pl-2">
        <div className="flex gap-3">
          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${dateBoxClasses}`}>
            <span className="text-[0.65rem] font-bold uppercase opacity-80">{monthStr}</span>
            <span className="text-[1.1rem] font-black leading-none mt-0.5">{dayStr}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-bold text-[1.05rem] leading-tight transition-colors ${isPremium ? 'text-yellow-800' : 'text-slate-800 group-hover:text-orange-600'}`}>{booking.title}</h4>
              {isPremium && (
                <span className="bg-yellow-400 text-yellow-900 text-[0.6rem] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">Premium</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 
                booking.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 
                'bg-slate-100 text-slate-600'
              }`}>
                {booking.status}
              </span>
              <span className="text-[0.75rem] font-bold text-slate-400">{booking.category}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right flex flex-col items-end gap-1">
          <div className={`text-[1.1rem] font-black leading-none ${isPremium ? 'text-yellow-600' : 'text-slate-800'}`}>
            ₹{pkgAmount.toLocaleString()}
          </div>
          <div className="text-[0.7rem] font-bold text-slate-400 flex items-center gap-1">
            <i className="ph-fill ph-clock"></i> {booking.time || 'TBD'}
          </div>
        </div>
      </div>

      {/* Logistics & Payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-slate-100/50 ml-0 sm:ml-2">
        <div className="flex flex-col gap-1">
          <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">Location</span>
          <div className="text-[0.8rem] font-semibold text-slate-700 truncate flex items-center gap-1">
            <i className="ph-fill ph-map-pin text-orange-500"></i>
            {booking.location || 'Not Set'}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">Payment Status</span>
            <span className="text-[0.65rem] font-black text-slate-500">{progressPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-green-500' : hasDue ? 'bg-red-400' : 'bg-green-500'}`} 
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-[0.65rem] font-semibold text-slate-500">Paid: ₹{advanceAmount.toLocaleString()}</span>
            {hasDue && <span className="text-[0.65rem] font-bold text-red-500">Due: ₹{dueAmount.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {/* Client Contact Details */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 ml-0 sm:ml-2 pt-3 border-t border-slate-100/60 gap-3 sm:gap-0">
        <div className="flex flex-wrap items-center gap-2">
          <div 
            className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-slate-600 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg hover:border-orange-200 hover:text-orange-600 transition-colors cursor-pointer whitespace-nowrap"
            onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${booking.phone}`; }}
          >
            <i className="ph-fill ph-phone text-slate-400 group-hover:text-orange-500 transition-colors"></i> {booking.phone}
          </div>
          {booking.email && (
            <div className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-slate-600 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg truncate max-w-full sm:max-w-[160px] whitespace-nowrap">
              <i className="ph-fill ph-envelope text-slate-400"></i> {booking.email}
            </div>
          )}
        </div>
        <div className="text-[0.65rem] font-black text-slate-300 flex items-center self-end sm:self-auto gap-1 uppercase tracking-widest group-hover:text-orange-400 transition-colors">
          Details <i className="ph-bold ph-arrow-right"></i>
        </div>
      </div>
    </div>
  );
}
