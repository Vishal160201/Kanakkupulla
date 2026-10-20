import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { broadcastNotification } from "@/lib/notifications";
import { requirePermission, requireUser } from "@/lib/authz";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { bookingCreateApiSchema, bookingListQuerySchema } from "@/lib/validations/booking";
import crypto from "crypto";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, bookingListQuerySchema);
  if (query.error) return query.error;
  const { includeDeleted, startDate, endDate, limit, offset } = query.data;

  try {
    const whereClause: Prisma.BookingWhereInput = includeDeleted ? {} : { deletedAt: null };

    if (startDate || endDate) {
      whereClause.date = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
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
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("manage_bookings");
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  try {
    const parsed = await parseJsonBody(request, bookingCreateApiSchema);
    if (parsed.error) return parsed.error;
    const { clientId, category, date, time, location, status, galleryUrl, contractUrl, customData } = parsed.data;

    let nextBookingNumber = "";
    let isUnique = false;
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
        customData: customData ?? undefined,
        createdBy: { connect: { id: userId } },
        updatedBy: { connect: { id: userId } },
      },
      include: {
        client: { select: { id: true, name: true } },
      }
    });

    await prisma.systemLog.create({
      data: {
        action: "BOOKING_CREATED",
        details: `Created booking ID: ${newBooking.id} via API`,
        userId,
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
    console.error("Failed to create booking:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
