import BookingDetailsModal from "@/components/dashboard/BookingDetailsModal";

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Data is loaded (and access-checked) client-side via /api/bookings/[id];
  // the modal renders its own loading and error states.
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50">
      <BookingDetailsModal standaloneBookingId={id} />
    </div>
  );
}
