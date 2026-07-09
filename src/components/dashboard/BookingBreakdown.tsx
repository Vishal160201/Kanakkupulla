import React from 'react';
import Link from 'next/link';
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
interface BookingBreakdownProps {
  data?: { id: string; clientName: string; status: string; date: string }[];
}

export default function BookingBreakdown({ data = [] }: BookingBreakdownProps) {
  const { openBookingDetails } = useGlobalForm();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': 
        return (
          <span className="flex items-center gap-1.5 text-[0.6rem] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-orange-50 text-orange-500">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            PENDING
          </span>
        );
      case 'Designing': 
        return (
          <span className="flex items-center gap-1.5 text-[0.6rem] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-blue-50 text-blue-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            DESIGNING
          </span>
        );
      case 'Sent for printing': 
        return (
          <span className="flex items-center gap-1.5 text-[0.6rem] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-amber-50 text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            PRINTING
          </span>
        );
      case 'Ready for delivery': 
        return (
          <span className="flex items-center gap-1.5 text-[0.6rem] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-emerald-50 text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            READY
          </span>
        );
      default: 
        return (
          <span className="flex items-center gap-1.5 text-[0.6rem] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-slate-50 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-[24px] p-5 lg:p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 group/card hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-4 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
            <i className="ph-bold ph-book-open text-xl"></i>
          </div>
          <div>
            <h3 className="text-[1.05rem] font-black text-slate-800 tracking-tight leading-tight">Album Tracking</h3>
            <p className="text-slate-400 text-[0.7rem] font-medium mt-0.5">Track upcoming album releases</p>
          </div>
        </div>
        <Link href="/bookings/album-status" className="text-[0.75rem] font-bold text-indigo-600 bg-indigo-50/80 px-3 py-1.5 rounded-xl hover:bg-indigo-100 flex items-center gap-1 transition-colors shrink-0">
          View All <i className="ph-bold ph-arrow-right"></i>
        </Link>
      </div>
      
      {/* List */}
      <div className="flex-1 flex flex-col mt-1">
        {(!data || data.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
            <i className="ph ph-books text-3xl mb-2 opacity-50"></i>
            <p className="font-medium text-sm">No albums pending for period.</p>
          </div>
        ) : (
          data.slice(0, 5).map((album, index) => {
            return (
              <React.Fragment key={album.id}>
                <div onClick={() => openBookingDetails(album.id)} className="flex items-center justify-between group py-2 px-3 -mx-3 rounded-2xl hover:bg-white cursor-pointer transition-all duration-300 hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 hover:scale-[1.01] relative z-10 border border-transparent hover:border-slate-50">
                  <div className="flex items-center gap-3">
                    
                    {/* Icon Container */}
                    <div className="w-11 h-11 rounded-[14px] bg-indigo-50/80 flex items-center justify-center shrink-0 group-hover:bg-indigo-100/50 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-indigo-400/90 flex items-center justify-center shadow-sm text-white">
                        <i className="ph-bold ph-clock text-[0.95rem]"></i>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#0f172a] font-extrabold text-[0.8rem] truncate max-w-[150px] uppercase tracking-tight">{album.clientName}</span>
                      <span className="text-slate-400 text-[0.65rem] font-bold flex items-center gap-1">
                        <i className="ph-bold ph-calendar-blank text-[0.75rem]"></i>
                        {new Date(album.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/-/g, '/')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pl-2">
                    {getStatusBadge(album.status)}
                    <i className="ph-bold ph-caret-right text-slate-300 group-hover:text-slate-500 transition-colors text-base"></i>
                  </div>
                </div>
                
                {/* Separator */}
                {index !== Math.min(data.length, 5) - 1 && (
                  <div className="h-[1px] bg-slate-50 mx-2 my-1"></div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
