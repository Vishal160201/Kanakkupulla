import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { broadcastNotification } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        order: true,
        transactions: true,
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
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;
    const body = await request.json();
    const { category, date, time, location, status, galleryUrl, contractUrl, customData, packageName, inclusions, notes, attachments, photographers } = body;

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
        customData,
        packageName,
        inclusions,
        notes,
        attachments,
        photographers,
        ...( (session?.user as any)?.id ? { updatedBy: { connect: { id: (session?.user as any)?.id } } } : {} ),
      },
    });

    await prisma.systemLog.create({
      data: {
        action: "BOOKING_UPDATED",
        details: `Updated booking ID: ${updated.id} via API`,
        userId: (session.user as any).id,
      }
    });

    // Notify admins about the update
      // Fire and forget
      broadcastNotification({
        title: "Booking Status Update",
        message: `Booking ${updated.bookingNumber || `#${updated.id.substring(0, 8)}`} status changed to ${status}.`,
        type: "BOOKING_UPDATED",
        actionUrl: `/bookings/details/${updated.id}`,
        entityId: updated.id,
        entityType: "booking",
        skipUserId: (session?.user as any)?.id
      }).catch(console.error);

    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";

    if (hardDelete) {
      await prisma.booking.delete({
        where: { id },
      });
      await prisma.systemLog.create({
        data: {
          action: "BOOKING_HARD_DELETED",
          details: `Hard deleted booking ID: ${id} via API`,
          userId: (session.user as any).id,
        }
      });
    } else {
      const existing = await prisma.booking.findUnique({ where: { id } });
      if (existing) {
        await prisma.booking.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        // Delete associated transactions first to prevent foreign key constraint failures
        const txDeleteResult = await prisma.transaction.updateMany({
          where: { bookingId: id },
          data: { deletedAt: new Date() }
        });
        await prisma.recycleBin.create({
          data: {
            itemType: "booking",
            itemId: id,
            originalData: existing as any,
            trashedById: (session.user as any).id,
          }
        });
      }
      await prisma.systemLog.create({
        data: {
          action: "BOOKING_SOFT_DELETED",
          details: `Soft deleted booking ID: ${id} via API`,
          userId: (session.user as any).id,
        }
      });
    }

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
