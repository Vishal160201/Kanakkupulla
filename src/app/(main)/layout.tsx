import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import { BookingProvider } from "@/components/providers/BookingProvider";
import prisma from "@/lib/prisma";
import { Booking } from "@/types";
import React from "react";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbBookings = await prisma.booking.findMany({
    include: { client: true, order: true },
    orderBy: { date: 'desc' }
  });

  const initialBookings: Booking[] = dbBookings.map(b => ({
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
    <BookingProvider initialBookings={initialBookings}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopNavigation />
        <div className="flex-1 overflow-auto bg-[#fafafa] p-8">
          {children}
        </div>
      </main>
    </BookingProvider>
  );
}
