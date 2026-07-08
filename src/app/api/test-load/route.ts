import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  // Simulate the load of the bookings overview endpoint
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  
  let dateFilter = {};
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter = {
      date: {
        gte: start,
        lte: end,
      },
    };
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        ...dateFilter,
      },
      include: {
        client: true,
        order: true,
        transactions: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json({
      items: bookings,
      total: bookings.length,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Simulate booking creation for stress testing
    const client = await prisma.client.create({
      data: { name: "Load Test Client", phone: "0000000000", email: "load@test.com" }
    });
    
    const newBooking = await prisma.booking.create({
      data: {
        bookingNumber: `#LT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        clientId: client.id,
        category: "Wedding",
        date: new Date(),
        time: "10:00 AM",
        location: "Load Test Location",
        status: "Confirmed"
      }
    });

    await prisma.order.create({
      data: {
        bookingId: newBooking.id,
        package: 10000,
        advance: 5000,
        due: 5000
      }
    });

    return NextResponse.json({ success: true, id: newBooking.id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
