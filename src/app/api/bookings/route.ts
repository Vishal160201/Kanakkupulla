import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { broadcastNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const whereClause: any = includeDeleted ? {} : { deletedAt: null };
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        client: true,
        order: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(bookings, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, category, date, time, location, status, galleryUrl, contractUrl, customData } = body;

    if (!clientId || !date || !time || !location) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
    }

    const allMdBookings = await prisma.booking.findMany({
      where: { bookingNumber: { startsWith: '#MD-' } },
      select: { bookingNumber: true }
    });
    let maxNum = 0;
    for (const b of allMdBookings) {
      if (b.bookingNumber) {
        const match = b.bookingNumber.match(/#MD-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextBookingNumber = `#MD-${String(maxNum + 1).padStart(3, '0')}`;

    const newBooking = await prisma.booking.create({
      data: {
        bookingNumber: nextBookingNumber,
        clientId,
        category: category || "Wedding",
        date: new Date(date),
        time,
        location,
        status: status || "Confirmed",
        galleryUrl,
        contractUrl,
        customData,
      },
      include: {
        client: true,
      }
    });

    await prisma.systemLog.create({
      data: {
        action: "BOOKING_CREATED",
        details: `Created booking ID: ${newBooking.id} via API`,
        userId: (session.user as any).id,
      }
    });

    // Notify Admins about the new booking
    await broadcastNotification(
      "New Booking Request",
      `A new ${category || 'Wedding'} booking for ${newBooking.client?.name || 'a client'} has been created!`,
      "BOOKING",
      `/bookings/details/${newBooking.id}`
    );

    return NextResponse.json(newBooking, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
