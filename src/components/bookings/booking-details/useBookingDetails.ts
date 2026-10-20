"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { deleteBookingAction, updateBookingStatusAction, updateAlbumTrackingAction, generateInvoiceAction } from "@/app/actions";
import type {
  AlbumTrackingUpdates, BookingDetail, BookingDetailResponse, LayoutResponse, TeamUser,
} from "@/types/bookings";
import { getAllFields, parseCustomData, parseJsonColumn } from "../layoutUtils";

const ALBUM_STATUSES = ['designing', 'sent for printing', 'ready for delivery', 'delivered'];

// Globally invalidate SWR keys so Bookings list, Calendar, Dashboard, and Album Status sync instantly
function revalidateBookingCaches() {
  globalMutate(
    (key) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard')),
    undefined,
    { revalidate: true }
  );
}

/** Loads a booking (plus the booking layout and team) and exposes the details-view actions. */
export function useBookingDetails(bookingId: string | null, onDeleted: () => void) {
  const router = useRouter();

  const { data: fetchedBooking, error: bookingError, mutate: refreshBooking } = useSWR<BookingDetailResponse, Error>(
    bookingId ? `/api/bookings/${bookingId}` : null,
    fetcher
  );
  const { data: layoutRes } = useSWR<LayoutResponse>("/api/settings/layouts/BOOKING_FORM", fetcher);
  const { data: usersRes } = useSWR<TeamUser[] | { data?: TeamUser[] }>("/api/users", fetcher);

  const booking: BookingDetail | null = bookingId && fetchedBooking ? {
    ...fetchedBooking,
    customData: parseCustomData(fetchedBooking.customData),
    inclusions: parseJsonColumn<unknown>(fetchedBooking.inclusions, []),
  } : null;

  const layoutSchema = layoutRes?.schema || null;
  const teamUsers: TeamUser[] = usersRes ? (Array.isArray(usersRes) ? usersRes : (usersRes.data || [])) : [];

  const allFields = getAllFields(layoutSchema);
  const statusField = allFields.find(f => f.id === 'fld_b_status') || allFields.find(f => f.type === 'STATUS_PICKER');
  const isStatusPicker = statusField?.type === 'STATUS_PICKER';
  const statusOptions = isStatusPicker ? (statusField.statusOptions || []) : [];

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const changeStatus = async (newStatus: string) => {
    if (!booking) return;
    setIsUpdatingStatus(true);

    let res;
    const s = newStatus.toLowerCase();
    if (ALBUM_STATUSES.includes(s)) {
      res = await updateAlbumTrackingAction(booking.id, { customData: { fld_b_album_status: newStatus }, status: newStatus });
    } else {
      res = await updateBookingStatusAction(booking.id, newStatus);
    }

    setIsUpdatingStatus(false);
    if (res.success) {
      toast.success(`Status updated to ${newStatus}`);
      setIsStatusDropdownOpen(false);
      refreshBooking();
      revalidateBookingCaches();
      router.refresh();
    } else {
      toast.error("Failed to update status");
    }
  };

  const changeSectionStatus = async (fieldId: string, newStatus: string) => {
    if (!booking) return;
    if (fieldId === 'fld_b_status') {
      return changeStatus(newStatus);
    }

    setIsUpdatingStatus(true);
    const updates: AlbumTrackingUpdates = { customData: { [fieldId]: newStatus } };
    if (fieldId === 'fld_b_album_status') {
      updates.status = newStatus;
    }
    const res = await updateAlbumTrackingAction(booking.id, updates);
    setIsUpdatingStatus(false);

    if (res.success) {
      toast.success(`Status updated to ${newStatus}`);
      refreshBooking();
      revalidateBookingCaches();
      router.refresh();
    } else {
      toast.error("Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (booking) {
      setIsDeleting(true);
      try {
        const res = await deleteBookingAction(booking.id);
        if (res.success) {
          toast.success("Booking deleted successfully!");
          setIsDeleteConfirmOpen(false);
          onDeleted();
          revalidateBookingCaches();
          router.refresh();
        } else {
          toast.error("Failed to delete booking.");
        }
      } catch {
        toast.error('Failed to delete booking');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const generateInvoice = async () => {
    if (!booking) return;
    setIsGeneratingInvoice(true);
    try {
      const res = await generateInvoiceAction(booking.id);
      if (!res.success) {
        toast.error(res.error || "Failed to generate invoice");
        return;
      }
      toast.success("Invoice generated successfully!");
      window.open(`/api/invoices/${res.invoiceId}/pdf`, "_blank");
    } catch {
      toast.error("Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // "Export" saves a PDF snapshot of the details view itself (not an invoice; invoices are
  // rendered server-side by /api/invoices/[id]/pdf).
  const exportBooking = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('booking-details-content');
      if (!element || !booking) return;
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.height > canvas.width ? 'p' : 'l',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Booking_Export_${booking.bookingNumber || booking.id.slice(-6).toUpperCase()}.pdf`);
      toast.success("Booking exported successfully!");
    } catch {
      toast.error("Failed to export booking");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    booking,
    bookingError,
    layoutSchema,
    teamUsers,
    isStatusPicker,
    statusOptions,
    isDeleteConfirmOpen, setIsDeleteConfirmOpen,
    isDeleting,
    isUpdatingStatus,
    isGeneratingInvoice,
    isExporting,
    isStatusDropdownOpen, setIsStatusDropdownOpen,
    changeStatus,
    changeSectionStatus,
    confirmDelete,
    generateInvoice,
    exportBooking,
  };
}

export type BookingDetailsState = ReturnType<typeof useBookingDetails>;
