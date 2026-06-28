import prisma from "@/lib/prisma";
import { Booking } from "@/types";
import UpcomingShootFeed from "./UpcomingShootFeed";

export const dynamic = "force-dynamic";

export default async function UpcomingBookingsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dbBookings = await prisma.booking.findMany({
    where: { 
      deletedAt: null,
      date: { gte: today }
    },
    include: { client: true, order: true },
    orderBy: [
      { date: 'asc' },
      { time: 'asc' }
    ]
  });

  const bookings: Booking[] = dbBookings.map(b => ({
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

  return (
    <div className="w-full pb-12">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Upcoming Shoots</h2>
          <p className="text-slate-500 text-sm mt-1">Focus on logistics, payments, and readiness for your next events.</p>
        </div>
        <div className="text-right">
          <div className="text-[2rem] font-black text-orange-500 leading-none">{bookings.length}</div>
          <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Scheduled</div>
        </div>
      </div>
      
      <UpcomingShootFeed bookings={bookings} />
    </div>
  );
}
