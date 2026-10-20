"use client";

import { useBookings } from '../providers/BookingProvider';
import { Booking } from '@/types';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/components/providers/SystemProvider';
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { clickableProps } from "@/components/bookings/clickableProps";

interface BookingTableProps {
  bookings: Booking[];
  currentPage?: number;
  totalPages?: number;
}

import { useEffect } from 'react';
import { Tooltip } from "@/components/ui/Tooltip";

/** Shared column template for the table header and rows: client, category, date, location, amount, status, menu. */
const ROW_GRID = "grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(110px,1fr)_minmax(140px,1fr)_40px] items-center gap-x-4";

export default function BookingTable({ bookings, currentPage = 1, totalPages = 1 }: BookingTableProps) {
  const { filters, setHasData } = useBookings();
  const { preferences } = useSystem();
  const { openBookingDetails } = useGlobalForm();
  const router = useRouter();

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

  useEffect(() => {
    setHasData(sorted.length > 0);
  }, [sorted.length, setHasData]);

  const getAvatarColor = () => {
    // Return a consistent black/slate theme
    return 'bg-slate-900 text-white';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Wedding': return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'Baby & Kids': return 'bg-pink-50 text-pink-700 border border-pink-100';
      case 'Corporate': return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Fashion': return 'bg-green-50 text-green-700 border border-green-100';
      case 'Maternity': return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'Pre-wedding': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'Event': return 'bg-orange-50 text-orange-700 border border-orange-100';
      default: return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-sm overflow-hidden flex flex-col">
      
      {/* Card List (phones and tablets; the table needs laptop width) */}
      <div className="block lg:hidden space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
        {sorted.map(b => {
          const d = new Date(b.date);
          const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const badgeClass = getCategoryColor(b.category);
          
          let statusDotClass = 'bg-slate-300';
          let statusTextClass = 'text-slate-500';
          let customStatusStyle = {};
          if (preferences?.statusColors?.[b.status]) {
            customStatusStyle = {
              '--status-bg': preferences.statusColors[b.status].bg,
              '--status-text': preferences.statusColors[b.status].text
            };
            statusDotClass = '';
            statusTextClass = '';
          } else {
            if (b.status === 'Confirmed') { statusDotClass = 'bg-emerald-500'; statusTextClass = 'text-emerald-700'; }
            else if (b.status === 'Pending') { statusDotClass = 'bg-red-500'; statusTextClass = 'text-red-700'; }
            else if (b.status === 'Partial') { statusDotClass = 'bg-orange-500'; statusTextClass = 'text-orange-700'; }
          }

          const displayId = b.bookingNumber || `#${b.id.substring(b.id.length - 6).toUpperCase()}`;
          const avatarColor = getAvatarColor();
          
          return (
            <div key={b.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col gap-3 shadow-sm cursor-pointer" {...clickableProps(() => openBookingDetails(b.id))}>
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-[40px] h-[40px] rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-[0.9rem] shrink-0`}>{(b.title || 'U').charAt(0).toUpperCase()}</div>
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <h4 className="font-extrabold text-[0.95rem] text-slate-900 leading-tight truncate" title={b.title}>{b.title}</h4>
                  <p className="font-bold text-[0.65rem] text-slate-400 tracking-[0.5px] uppercase truncate">{displayId}</p>
                  {/* Under the name, so the name gets the card's full width */}
                  <div className="mt-1.5 flex w-fit max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200" style={customStatusStyle}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`} style={customStatusStyle && {'backgroundColor': 'var(--status-text)'}}></div>
                    <span className={`text-[0.7rem] font-bold truncate ${statusTextClass}`} style={customStatusStyle && {'color': 'var(--status-text)'}}>{b.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2">
                <span className={`px-2.5 py-1 rounded-xl text-[0.7rem] font-extrabold tracking-[0.5px] ${badgeClass}`}>{b.category}</span>
                <span className="text-[0.8rem] font-semibold text-slate-500 px-2 border-l border-slate-200">{displayDate}</span>
                <span className="text-[0.8rem] font-semibold text-slate-500 px-2 border-l border-slate-200">{b.time}</span>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-1">
                <div className={`px-2.5 py-1 rounded-lg text-[0.8rem] font-extrabold tracking-[0.5px] ${parseFloat(b.package || '0') > 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-slate-500 bg-white border border-slate-200'}`}>
                    {preferences?.currencySymbol || '₹'} {parseFloat(b.package || '0').toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Layout (laptop and up). Header and rows share ROW_GRID so the columns line up. */}
      <div className="hidden lg:block overflow-x-auto w-full">
        <div className="min-w-[760px]">
          <div className={`${ROW_GRID} px-4 py-3 border-b border-gray-200 text-slate-500 font-extrabold text-[0.7rem] uppercase tracking-[1px] sticky top-0 z-10 bg-white`}>
            <div className="min-w-0 truncate">Client</div>
            <div className="min-w-0 truncate">Category</div>
            <div className="min-w-0 truncate">Date & Time</div>
            <div className="min-w-0 truncate">Location</div>
            <div className="min-w-0 truncate">Amount</div>
            <div className="min-w-0 truncate">Status</div>
            <div className="w-[40px] text-center"><i className="ph-bold ph-gear text-[1.1rem]"></i></div>
          </div>
          
          <div id="dynamic-bookings-table" className="flex flex-col">
          {sorted.map(b => {
            const d = new Date(b.date);
            const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            const badgeClass = getCategoryColor(b.category);
            
            let statusDotClass = 'bg-slate-300';
            let statusTextClass = 'text-slate-500';
            let customStatusStyle = {};
            if (preferences?.statusColors?.[b.status]) {
              customStatusStyle = {
                '--status-bg': preferences.statusColors[b.status].bg,
                '--status-text': preferences.statusColors[b.status].text
              };
              statusDotClass = '';
              statusTextClass = '';
            } else {
              if (b.status === 'Confirmed') { statusDotClass = 'bg-emerald-500'; statusTextClass = 'text-emerald-700'; }
              else if (b.status === 'Pending') { statusDotClass = 'bg-red-500'; statusTextClass = 'text-red-700'; }
              else if (b.status === 'Partial') { statusDotClass = 'bg-orange-500'; statusTextClass = 'text-orange-700'; }
            }

            const displayId = b.bookingNumber || `#${b.id.substring(b.id.length - 6).toUpperCase()}`;
            const avatarColor = getAvatarColor();
            
            // Simple hash function for locations to get consistent colors
            const locName = (b.location || 'TBD').toLowerCase().trim();
            let locHash = 0;
            for (let i = 0; i < locName.length; i++) {
              locHash = locName.charCodeAt(i) + ((locHash << 5) - locHash);
            }
            const locColors = ['text-blue-500', 'text-emerald-500', 'text-violet-500', 'text-orange-500', 'text-rose-500', 'text-cyan-500', 'text-fuchsia-500', 'text-amber-500'];
            const locColor = locColors[Math.abs(locHash) % locColors.length];

            return (
              <div key={b.id} className={`${ROW_GRID} px-4 py-3.5 border-b border-gray-100 last:border-b-0 transition-colors hover:bg-slate-50 cursor-pointer`} {...clickableProps(() => openBookingDetails(b.id))}>
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`w-[35px] h-[35px] rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-[0.85rem] shrink-0`}>{(b.title || 'U').charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <h4 className="font-extrabold text-[0.95rem] text-slate-900 leading-tight truncate">{b.title}</h4>
                    <p className="font-bold text-[0.65rem] text-slate-400 tracking-[0.5px] uppercase truncate">{displayId}</p>
                  </div>
                </div>
                <div className="min-w-0 flex items-center">
                  <span className={`px-2.5 py-1 rounded-xl text-[0.7rem] font-extrabold tracking-[0.5px] truncate ${badgeClass}`}>{b.category}</span>
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <h4 className="font-bold text-[0.9rem] text-slate-900 leading-tight truncate">{displayDate}</h4>
                  <p className="font-semibold text-[0.75rem] text-slate-500 truncate">{b.time}</p>
                </div>
                <div className="min-w-0 flex items-center gap-1.5 font-semibold text-[0.85rem] text-slate-600">
                  <i className={`ph-fill ph-map-pin shrink-0 ${locColor}`}></i> <span className="truncate">{b.location || 'TBD'}</span>
                </div>
                <div className="min-w-0 flex items-center">
                  <div className={`px-2.5 py-1 rounded-lg text-[0.8rem] font-extrabold tracking-[0.5px] truncate ${parseFloat(b.package || '0') > 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-slate-500 bg-slate-50 border border-slate-200'}`}>
                      {preferences?.currencySymbol || '₹'} {parseFloat(b.package || '0').toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="min-w-0 flex items-center">
                  <div className="min-w-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100" style={customStatusStyle}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`} style={customStatusStyle && {'backgroundColor': 'var(--status-text)'}}></div>
                    <span className={`text-[0.7rem] font-bold truncate ${statusTextClass}`} title={b.status} style={customStatusStyle && {'color': 'var(--status-text)'}}>{b.status}</span>
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 mt-2">
            <span className="text-sm text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
            {(() => {
              const baseBtnClass = "px-3 py-1.5 text-sm font-bold bg-white border border-gray-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700";
              const activeBtnClass = "px-3 py-1.5 text-sm font-bold bg-slate-900 text-white border border-slate-900 rounded-xl";
              const navigateTo = (page: number) => router.push(`/bookings/allBookings?page=${page}`);

              if (totalPages <= 2) {
                return (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => navigateTo(currentPage - 1)} disabled={currentPage <= 1} className={baseBtnClass}>Previous</button>
                    <button type="button" onClick={() => navigateTo(currentPage + 1)} disabled={currentPage >= totalPages} className={baseBtnClass}>Next</button>
                  </div>
                );
              }

              let startPage = Math.max(1, currentPage - 1);
              let endPage = Math.min(totalPages, currentPage + 1);
              
              if (currentPage === 1) endPage = Math.min(totalPages, 3);
              if (currentPage === totalPages) startPage = Math.max(1, totalPages - 2);

              const pages = [];
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button type="button" key={i} onClick={() => navigateTo(i)} className={i === currentPage ? activeBtnClass : baseBtnClass}>
                    {i}
                  </button>
                );
              }

              return (
                <div className="flex gap-1.5 items-center">
                  <Tooltip content="First page">
                    <button type="button" onClick={() => navigateTo(1)} disabled={currentPage === 1} className={baseBtnClass}>
                      First
                    </button>
                  </Tooltip>
                  <button type="button" onClick={() => navigateTo(currentPage - 1)} disabled={currentPage <= 1} className={baseBtnClass}>
                    Prev
                  </button>
                  
                  {startPage > 1 && <span className="px-1 text-slate-400 font-bold">...</span>}
                  {pages}
                  {endPage < totalPages && <span className="px-1 text-slate-400 font-bold">...</span>}
                  
                  <button type="button" onClick={() => navigateTo(currentPage + 1)} disabled={currentPage >= totalPages} className={baseBtnClass}>
                    Next
                  </button>
                  <Tooltip content="Last page">
                    <button type="button" onClick={() => navigateTo(totalPages)} disabled={currentPage === totalPages} className={baseBtnClass}>
                      Last
                    </button>
                  </Tooltip>
                </div>
              );
            })()}
          </div>
        )}
      </div>
  );
}
