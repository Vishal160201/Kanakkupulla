import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAnyAccess } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { asJsonRecord } from "@/lib/validations/common";
import { bookingStatusApiSchema } from "@/lib/validations/booking";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAnyAccess(["bookings", "MANAGE"], ["albums", "MANAGE"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const parsed = await parseJsonBody(request, bookingStatusApiSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;
    const { status, albumStatus } = body;

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const dataToUpdate: Prisma.BookingUncheckedUpdateInput = { status, updatedById: auth.user.id };
    const existingCustomData = asJsonRecord(existing.customData);

    if (status === 'Shoot Completed' || status === 'Completed') {
      if (!existingCustomData.fld_b_album_status || existingCustomData.fld_b_album_status === 'Pending') {
        dataToUpdate.customData = { ...existingCustomData, fld_b_album_status: 'Pending' };
      }
    } else if (albumStatus) {
      dataToUpdate.albumStatus = albumStatus;
    }

    if (body.customData) {
      if (body.customData.fld_b_album_status === 'Delivered') {
        dataToUpdate.galleryDelivered = true;
      }
      dataToUpdate.customData = { ...existingCustomData, ...body.customData };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
