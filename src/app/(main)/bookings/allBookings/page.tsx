import BookingTable from '@/components/dashboard/BookingTable';
import prisma from "@/lib/prisma";
import { Booking } from "@/types";

export default async function AllBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [dbBookings, totalCount] = await Promise.all([
    prisma.booking.findMany({
      where: { deletedAt: null },
      include: { client: true, order: true },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where: { deletedAt: null } })
  ]);

  const bookings: Booking[] = dbBookings.map((b: typeof dbBookings[number]) => ({
    id: b.id,
    title: b.client.name,
    category: b.category,
    date: b.date.toISOString().split('T')[0],
    time: b.time,
    location: b.location,
    phone: b.client.phone,
    email: b.client.email || '',
    package: b.order?.package.toString() || '',
    advance: b.order?.advance.toString() || '',
    due: b.order?.due.toString() || '',
    status: b.status as any
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <BookingTable bookings={bookings} currentPage={page} totalPages={totalPages} />
  );
}
