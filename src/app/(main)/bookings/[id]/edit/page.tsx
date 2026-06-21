import BookingFormModal from "@/components/dashboard/BookingFormModal";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function BookingEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { order: true }
  });
  
  if (!booking) {
    notFound();
  }

  // Convert dates and Prisma Decimal to standard JS types for the client component
  const safeBooking = {
    ...booking,
    createdAt: booking.createdAt?.toISOString(),
    updatedAt: booking.updatedAt?.toISOString(),
    order: booking.order ? {
      ...booking.order,
      package: booking.order.package?.toString(),
      advance: booking.order.advance?.toString(),
      due: booking.order.due?.toString(),
      createdAt: booking.order.createdAt?.toISOString(),
      updatedAt: booking.order.updatedAt?.toISOString(),
    } : null
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 relative h-[calc(100vh-80px)] overflow-hidden">
      <BookingFormModal booking={safeBooking as any} />
    </div>
  );
}
