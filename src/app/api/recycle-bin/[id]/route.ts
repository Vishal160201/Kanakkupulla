import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    const entry = await prisma.recycleBin.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (entry.itemType === "booking") {
      try {
        await prisma.transaction.deleteMany({ where: { bookingId: entry.itemId } });
        await prisma.order.deleteMany({ where: { bookingId: entry.itemId } });
        await prisma.booking.delete({ where: { id: entry.itemId } });
      } catch (e) {
      }
    }
    if (entry.itemType === "product-order" || entry.itemType === "gift" || entry.itemType === "frame") {
      try {
        await prisma.transaction.deleteMany({ where: { productOrderId: entry.itemId } });
        await prisma.productOrder.delete({ where: { id: entry.itemId } });
      } catch (e) {
      }
    }

    await prisma.recycleBin.delete({ where: { id } });

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_DELETE",
        details: `Permanently deleted item ${id} from recycle bin`,
        userId: (session.user as any).id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
