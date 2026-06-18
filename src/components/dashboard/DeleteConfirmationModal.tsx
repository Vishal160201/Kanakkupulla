"use client";

import { useBookings } from "../providers/BookingProvider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { deleteBookingAction } from "@/app/actions";
import { toast } from "sonner";

export default function DeleteConfirmationModal() {
  const { 
    activeDetailsBooking: selectedBooking, setActiveDetailsBooking,
    isDeleteConfirmOpen, setIsDeleteConfirmOpen
  } = useBookings();

  const confirmDelete = async () => {
    if (selectedBooking) {
      const idToDelete = selectedBooking.id;
      // deleteBooking(idToDelete); // Replaced by server action
      setActiveDetailsBooking(null);
      setIsDeleteConfirmOpen(false);
      const res = await deleteBookingAction(idToDelete);
      if (res.success) {
        toast.success("Booking deleted successfully!");
      } else {
        toast.error("Failed to delete booking.");
      }
    }
  };

  return (
    <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
      {selectedBooking && (
      <DialogContent className="max-w-[400px] p-8 text-center bg-white rounded-3xl border-0 shadow-2xl !rounded-3xl">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-3xl mx-auto mb-5">
          <i className="ph-fill ph-trash"></i>
        </div>
        <DialogTitle className="text-xl font-extrabold text-slate-900 mb-2">Delete Booking</DialogTitle>
        <p className="text-slate-500 text-[0.95rem] leading-relaxed mb-8">
          Are you sure you want to delete the booking for <strong className="text-slate-900">{selectedBooking.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-center">
          <button className="flex-1 px-5 py-2.5 rounded-full font-bold text-[0.95rem] text-slate-700 bg-white border border-gray-200 hover:bg-slate-50 transition-colors" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
          <button className="flex-1 px-5 py-2.5 rounded-full font-bold text-[0.95rem] text-white bg-red-500 hover:bg-red-600 shadow-md transition-all" onClick={confirmDelete}>Delete</button>
        </div>
      </DialogContent>
      )}
    </Dialog>
  );
}
