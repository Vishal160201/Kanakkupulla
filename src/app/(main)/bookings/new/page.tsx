import BookingFormModal from "@/components/dashboard/BookingFormModal";

export default function NewBookingPage() {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <BookingFormModal booking={null} />
    </div>
  );
}
