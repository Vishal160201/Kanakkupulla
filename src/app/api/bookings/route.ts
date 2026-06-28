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
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const whereClause: any = includeDeleted ? {} : { deletedAt: null };
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: whereClause,
        select: {
          id: true,
          bookingNumber: true,
          clientId: true,
          category: true,
          date: true,
          time: true,
          location: true,
          status: true,
          packageName: true,
          createdAt: true,
          client: { select: { id: true, name: true, phone: true } },
          order: { select: { id: true, package: true, advance: true, due: true } },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.booking.count({ where: whereClause }),
    ]);

    return NextResponse.json({ items: bookings, total, limit, offset }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
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

    let nextBookingNumber = "";
    let isUnique = false;
    const crypto = require('crypto');
    while (!isUnique) {
      const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      nextBookingNumber = `#MD-${suffix}`;
      
      const activeExists = await prisma.booking.findFirst({
        where: { bookingNumber: nextBookingNumber }
      });
      
      if (!activeExists) {
        isUnique = true;
      }
    }

    const userId = (session?.user as any)?.id as string | undefined;

    const newBooking = await prisma.booking.create({
      data: {
        bookingNumber: nextBookingNumber,
        client: { connect: { id: clientId } },
        category: category || "Wedding",
        date: new Date(date),
        time,
        location,
        status: status || "Confirmed",
        galleryUrl,
        contractUrl,
        customData,
        ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
        ...(userId ? { updatedBy: { connect: { id: userId } } } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
      }
    });

    await prisma.systemLog.create({
      data: {
        action: "BOOKING_CREATED",
        details: `Created booking ID: ${newBooking.id} via API`,
        userId: userId || "SYSTEM",
      }
    });

    // Notify Admins about the new booking
    // Fire and forget
    broadcastNotification({
      title: "New Booking Request",
      message: `A new ${category || 'Wedding'} booking for ${newBooking.client?.name || 'a client'} has been created!`,
      type: "BOOKING_CREATED",
      actionUrl: `/bookings/details/${newBooking.id}`,
      entityId: newBooking.id,
      entityType: "booking",
      skipUserId: userId
    }).catch(console.error);

    return NextResponse.json(newBooking, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
