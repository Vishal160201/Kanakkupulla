"use client";

import { useBookings } from "../providers/BookingProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function BookingDetailsModal() {
  const { 
    activeDetailsBooking: selectedBooking, setActiveDetailsBooking,
    setIsAddModalOpen, setActiveEditBooking,
    isDeleteConfirmOpen, setIsDeleteConfirmOpen
  } = useBookings();

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  return (
    <Dialog open={!!selectedBooking && !isDeleteConfirmOpen} onOpenChange={(open) => {
      if (!open) setActiveDetailsBooking(null);
    }}>
      {selectedBooking && (
      <DialogContent className="max-w-[600px] sm:max-w-[600px] p-0 bg-white rounded-3xl overflow-hidden border-0 shadow-2xl !rounded-3xl">
        <DialogHeader className="bg-slate-50 border-b border-gray-100 px-10 py-8 relative">
          <div className="flex flex-col items-center">
            <i className="ph-fill ph-eye text-orange-500 text-[2rem] bg-orange-50 p-3 rounded-full mb-4"></i>
            <span className="text-[0.75rem] font-bold text-slate-500 uppercase tracking-[1px] mb-1">Booking Details</span>
            <DialogTitle className="text-[1.5rem] font-extrabold text-slate-900 leading-tight">
              {selectedBooking.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-10 py-8">
          <div className="flex items-center justify-between bg-[#fafaf9] border border-gray-200 p-5 rounded-2xl mb-5">
            <div className="flex items-center gap-4">
              <div className="w-[45px] h-[45px] rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[1.1rem]">
                {selectedBooking.title.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-500 text-[0.85rem]">{selectedBooking.category}</span>
                <span className="font-extrabold text-slate-900 text-[1.1rem]">{selectedBooking.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-bold text-[0.95rem] text-slate-700">
              <div className={`w-2.5 h-2.5 rounded-full ${selectedBooking.status === 'Confirmed' ? 'bg-green-500' : selectedBooking.status === 'Pending' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
              {selectedBooking.status}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col p-4 bg-slate-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-orange-500 mb-1"><i className="ph-regular ph-calendar-blank"></i><span className="text-[0.75rem] font-bold text-slate-500 uppercase">Schedule</span></div>
              <div className="font-bold text-slate-900 text-[0.95rem]">{new Date(selectedBooking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {selectedBooking.time}</div>
            </div>
            <div className="flex flex-col p-4 bg-slate-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-orange-500 mb-1"><i className="ph-regular ph-map-pin"></i><span className="text-[0.75rem] font-bold text-slate-500 uppercase">Location</span></div>
              <div className="font-bold text-slate-900 text-[0.95rem]">{selectedBooking.location || 'TBD'}</div>
            </div>
            <div className="flex flex-col p-4 bg-slate-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-orange-500 mb-1"><i className="ph-regular ph-currency-inr"></i><span className="text-[0.75rem] font-bold text-slate-500 uppercase">Package</span></div>
              <div className="font-bold text-slate-900 text-[0.95rem]">₹{selectedBooking.package || '0'}</div>
            </div>
            <div className="flex flex-col p-4 bg-slate-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-orange-500 mb-1"><i className="ph-regular ph-currency-inr"></i><span className="text-[0.75rem] font-bold text-slate-500 uppercase">Advance</span></div>
              <div className="font-bold text-slate-900 text-[0.95rem]">₹{selectedBooking.advance || '0'}</div>
            </div>
            <div className="flex flex-col p-4 bg-slate-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-orange-500 mb-1"><i className="ph-regular ph-currency-inr"></i><span className="text-[0.75rem] font-bold text-slate-500 uppercase">Outstanding</span></div>
              <div className="font-bold text-slate-900 text-[0.95rem]">₹{selectedBooking.due || '0'}</div>
            </div>
            <div className="flex flex-col p-4 bg-slate-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-orange-500 mb-1"><i className="ph-regular ph-phone"></i><span className="text-[0.75rem] font-bold text-slate-500 uppercase">Phone</span></div>
              <div className="font-bold text-slate-900 text-[0.95rem]">{selectedBooking.phone || 'Not recorded'}</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 border-t border-gray-100 px-10 py-6 flex justify-between items-center rounded-b-3xl">
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-full font-bold text-[0.95rem] text-slate-700 bg-white border border-gray-200 hover:bg-slate-50 shadow-sm transition-all" onClick={() => { setActiveEditBooking(selectedBooking); setIsAddModalOpen(true); setActiveDetailsBooking(null); }}>Edit</button>
          </div>
          <button className="px-6 py-2.5 rounded-full font-bold text-[0.95rem] bg-slate-800 text-white shadow-md hover:bg-slate-700 hover:-translate-y-[1px] hover:shadow-lg transition-all" onClick={() => setActiveDetailsBooking(null)}>Close</button>
        </div>
      </DialogContent>
      )}
    </Dialog>
  );
}
