import BookingDetailsModal from "@/components/dashboard/BookingDetailsModal";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true, order: true, createdBy: true, updatedBy: true }
  });

  if (!booking) notFound();

  const safeBooking = {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    title: booking.client.name,
    category: booking.category,
    date: booking.date.toISOString().split('T')[0],
    time: booking.time,
    location: booking.location,
    phone: booking.client.phone,
    email: booking.client.email || '',
    package: booking.order?.package.toString() || '',
    advance: booking.order?.advance.toString() || '',
    due: booking.order?.due.toString() || '',
    status: booking.status as any,
    customData: booking.customData as Record<string, any> | null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    inclusions: booking.inclusions,
    notes: booking.notes,
    attachments: booking.attachments,
    photographers: booking.photographers,
    createdBy: booking.createdBy,
    updatedBy: booking.updatedBy,
  };

  return (
    <div className="flex justify-center items-center h-full w-full">
      <BookingDetailsModal />
    </div>
  );
}
