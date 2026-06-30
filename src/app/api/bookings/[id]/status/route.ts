import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, albumStatus } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const existing = await prisma.booking.findUnique({ where: { id } });
    const dataToUpdate: any = { status, updatedById: (session.user as any)?.id };
    
    if (status === 'Shoot Completed' || status === 'Completed') {
      let customData = existing?.customData as Record<string, any> || {};
      if (typeof customData === 'string') {
        try { customData = JSON.parse(customData); } catch(e) { customData = {}; }
      }
      
      if (!customData.fld_b_album_status || customData.fld_b_album_status === 'Pending') {
         dataToUpdate.customData = { ...customData, fld_b_album_status: 'Pending' };
      }
    } else if (albumStatus) {
      dataToUpdate.albumStatus = albumStatus;
    }

    if (body.customData?.fld_b_album_status === 'Delivered') {
      dataToUpdate.galleryDelivered = true;
      let customData = existing?.customData as Record<string, any> || {};
      if (typeof customData === 'string') {
        try { customData = JSON.parse(customData); } catch(e) { customData = {}; }
      }
      dataToUpdate.customData = { ...customData, ...body.customData };
    } else if (body.customData) {
      let customData = existing?.customData as Record<string, any> || {};
      if (typeof customData === 'string') {
        try { customData = JSON.parse(customData); } catch(e) { customData = {}; }
      }
      dataToUpdate.customData = { ...customData, ...body.customData };
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
