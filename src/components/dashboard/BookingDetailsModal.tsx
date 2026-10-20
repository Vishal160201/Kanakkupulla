"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useAccess } from "@/hooks/useAccess";
import type { LayoutSection } from "@/types/bookings";
import { shortBookingId } from "@/components/bookings/layoutUtils";
import { useBookingDetails } from "@/components/bookings/booking-details/useBookingDetails";
import { isFieldVisibleForBooking } from "@/components/bookings/booking-details/bookingFields";
import BookingDetailsHeader from "@/components/bookings/booking-details/BookingDetailsHeader";
import { BookingInfoStrip, ClientInfoCard } from "@/components/bookings/booking-details/BookingInfoCards";
import LayoutSectionCard from "@/components/bookings/booking-details/LayoutSectionCard";
import SupplementaryCards from "@/components/bookings/booking-details/SupplementaryCards";
import FinancialsCard from "@/components/bookings/booking-details/FinancialsCard";
import { BookingActionBar, DeleteBookingDialog } from "@/components/bookings/booking-details/BookingDetailsFooter";

const EXCLUDED_SECTION_TITLES = ['financials', 'financial', 'focus'];

// Event sections first, then album sections, then the rest in layout order.
const bySectionPriority = (a: LayoutSection, b: LayoutSection) => {
  const titleA = (a.title || '').toLowerCase();
  const titleB = (b.title || '').toLowerCase();
  if (titleA.includes('event')) return -1;
  if (titleB.includes('event')) return 1;
  if (titleA.includes('album')) return -1;
  if (titleB.includes('album')) return 1;
  return 0;
};

export default function BookingDetailsModal({ standaloneBookingId }: { standaloneBookingId?: string }) {
  const router = useRouter();
  const { can } = useAccess();
  // Bookings are studio-wide data, so the studio level applies whatever shop is active.
  const canManageBookings = can("bookings", "MANAGE");
  // Album tracking updates also accept Album status Manage.
  const canManageAlbums = canManageBookings || can("albums", "MANAGE");
  const {
    openBookingForm,
    isBookingDetailsOpen,
    bookingDetailsId: contextBookingId,
    closeBookingDetails,
    openTransactionDetails
  } = useGlobalForm();

  const bookingDetailsId = standaloneBookingId || contextBookingId;
  const isVisible = standaloneBookingId ? true : isBookingDetailsOpen;

  const details = useBookingDetails(bookingDetailsId, closeBookingDetails);
  const { booking, bookingError, layoutSchema, teamUsers } = details;

  const albumDesignerId = (() => {
    for (const section of layoutSchema?.sections ?? []) {
      if (!section.fields) continue;
      const field = section.fields.find(f => ['album designer', 'album worker'].includes((f.name || '').toLowerCase()));
      if (field) return field.id;
    }
    return null;
  })();
  const albumDesignerVal = albumDesignerId ? booking?.customData?.[albumDesignerId] : null;

  const handleClose = () => {
    if (standaloneBookingId) {
      router.back();
    } else {
      closeBookingDetails();
    }
  };

  const content = (
    <div className={`w-full bg-[#F5F6F8] flex flex-col overflow-hidden relative ${standaloneBookingId ? 'h-full min-h-screen' : 'h-[100dvh] sm:h-[90dvh] max-h-[100dvh] sm:max-h-[90dvh] rounded-none sm:rounded-[2rem] shadow-2xl'}`}>
      {(!booking && bookingError) ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px] text-center">
          <i className="ph-bold ph-warning-circle text-3xl text-red-500 mb-3"></i>
          <p className="text-slate-700 font-semibold">Couldn&apos;t load booking details</p>
          <p className="text-slate-500 text-sm mt-1">{bookingError.message}</p>
          <button type="button" onClick={handleClose} className="mt-5 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">
            Close
          </button>
        </div>
      ) : (!booking) ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4" />
          <p className="text-slate-500 font-medium">Loading booking details...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">

          {/* Content is capped so cards don't spread across very wide screens; the header's own px-6 sits inside this cap, so it gets 3rem extra to line up with the cards */}
          <div className="shrink-0 w-full max-w-[calc(1400px+3rem)] mx-auto">
          <BookingDetailsHeader
            booking={booking}
            canManage={canManageBookings}
            isStatusPicker={details.isStatusPicker && canManageBookings}
            statusOptions={details.statusOptions}
            isStatusDropdownOpen={details.isStatusDropdownOpen}
            setIsStatusDropdownOpen={details.setIsStatusDropdownOpen}
            isUpdatingStatus={details.isUpdatingStatus}
            isExporting={details.isExporting}
            isGeneratingInvoice={details.isGeneratingInvoice}
            onDelete={() => details.setIsDeleteConfirmOpen(true)}
            onExport={details.exportBooking}
            onGenerateInvoice={details.generateInvoice}
            onChangeStatus={details.changeStatus}
          />
          </div>

          {/* Scrollable Content Area */}
          <main id="booking-details-content" className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
            <div className="w-full max-w-[1400px] mx-auto">

            <BookingInfoStrip booking={booking} teamUsers={teamUsers} albumDesignerVal={albumDesignerVal} />

            {/* Grid Area */}
            <div className="w-full">

              {/* Grid Layout for Dynamic Sections & Client Info */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                <ClientInfoCard booking={booking} />

                {layoutSchema?.sections?.filter(s => isFieldVisibleForBooking(booking, s.visibilityRule) && !EXCLUDED_SECTION_TITLES.includes(s.title?.toLowerCase()))
                  .sort(bySectionPriority)
                  .map(section => (
                    <LayoutSectionCard
                      key={section.id}
                      section={section}
                      booking={booking}
                      teamUsers={teamUsers}
                      isFieldVisible={(rule) => isFieldVisibleForBooking(booking, rule)}
                      isUpdatingStatus={details.isUpdatingStatus}
                      canChangeEventStatus={canManageBookings}
                      canChangeAlbumStatus={canManageAlbums}
                      onSectionStatusChange={details.changeSectionStatus}
                    />
                  ))}
              </div>

              <SupplementaryCards booking={booking} layoutSchema={layoutSchema} />

              {/* Row 3: Financials (Full Width) */}
              <div className="mt-6">
                <FinancialsCard booking={booking} onOpenTransaction={openTransactionDetails} />
              </div>
            </div>
            </div>
          </main>

          <BookingActionBar
            displayId={booking.bookingNumber || shortBookingId(booking.id)}
            onEdit={canManageBookings ? () => {
              openBookingForm(booking.id, undefined);
              closeBookingDetails();
            } : undefined}
            onClose={handleClose}
          />

        </div>
      )}
      <DeleteBookingDialog
        open={details.isDeleteConfirmOpen}
        onOpenChange={details.setIsDeleteConfirmOpen}
        isDeleting={details.isDeleting}
        onConfirm={details.confirmDelete}
      />
    </div>
  );

  if (standaloneBookingId) {
    return content;
  }

  return (
    <Dialog open={isVisible} onOpenChange={(open) => {
      if (!open) closeBookingDetails();
    }}>
      <DialogContent className="!max-w-[1300px] w-full sm:w-[95vw] p-0 bg-transparent border-0 shadow-none">
        <DialogTitle className="sr-only">Booking Details</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  );
}
