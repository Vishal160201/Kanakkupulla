import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { broadcastNotification } from "@/lib/notifications";
import { requireAccess } from "@/lib/authz";
import { trashBooking } from "@/lib/recycleBin";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { bookingDeleteQuerySchema, bookingUpdateApiSchema } from "@/lib/validations/booking";

/** undefined = leave unchanged, null = clear the Json column. */
const jsonInput = (value: Prisma.InputJsonValue | null | undefined) =>
  value === null ? Prisma.DbNull : value;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("bookings", "VIEW");
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        order: true,
        transactions: { where: { deletedAt: null } },
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(booking, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch booking:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("bookings", "MANAGE");
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  try {
    const id = (await params).id;
    const parsed = await parseJsonBody(request, bookingUpdateApiSchema);
    if (parsed.error) return parsed.error;
    const { category, date, time, location, status, galleryUrl, contractUrl, customData, packageName, inclusions, notes, attachments, photographers } = parsed.data;

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        category,
        date: date ? new Date(date) : undefined,
        time,
        location,
        status,
        galleryUrl,
        contractUrl,
        customData: customData ?? undefined,
        packageName,
        inclusions: jsonInput(inclusions),
        notes,
        attachments: jsonInput(attachments),
        photographers: jsonInput(photographers),
        updatedBy: { connect: { id: userId } },
      },
    });

    await prisma.systemLog.create({
      data: {
        action: "BOOKING_UPDATED",
        details: `Updated booking ID: ${updated.id} via API`,
        userId,
      }
    });

    // Notify admins about the update
      // Fire and forget
      broadcastNotification({
        title: "Booking Updated",
        message: status
          ? `Booking ${updated.bookingNumber || `#${updated.id.substring(0, 8)}`} status changed to ${status}.`
          : `Booking ${updated.bookingNumber || `#${updated.id.substring(0, 8)}`} has been updated.`,
        type: "BOOKING_UPDATED",
        actionUrl: `/bookings/details/${updated.id}`,
        entityId: updated.id,
        entityType: "booking",
        skipUserId: userId
      }).catch(console.error);

    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("bookings", "MANAGE");
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  try {
    const id = (await params).id;
    const query = parseSearchParams(request, bookingDeleteQuerySchema);
    if (query.error) return query.error;
    const hardDelete = query.data.hard;

    if (hardDelete) {
      if (auth.user.role !== "OWNER") {
        return NextResponse.json({ error: "Only owners can permanently delete bookings." }, { status: 403 });
      }
      await prisma.$transaction([
        prisma.transaction.deleteMany({ where: { bookingId: id } }),
        prisma.order.deleteMany({ where: { bookingId: id } }),
        prisma.invoice.deleteMany({ where: { bookingId: id } }),
        prisma.recycleBin.deleteMany({ where: { itemType: "booking", itemId: id } }),
        prisma.booking.delete({ where: { id } }),
        prisma.systemLog.create({
          data: {
            action: "BOOKING_HARD_DELETED",
            details: `Hard deleted booking ID: ${id} via API`,
            userId,
          }
        }),
      ]);
    } else {
      await trashBooking(id, userId);
    }

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to delete booking:", error);
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
