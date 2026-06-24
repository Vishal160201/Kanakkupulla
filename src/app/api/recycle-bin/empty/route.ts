import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userRole = (session.user as any).role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });
  }

  try {
    const entries = await prisma.recycleBin.findMany({});

    for (const entry of entries) {
      if (entry.itemType === "booking") {
        try {
          await prisma.transaction.deleteMany({ where: { bookingId: entry.itemId } });
          await prisma.order.deleteMany({ where: { bookingId: entry.itemId } });
          await prisma.booking.delete({ where: { id: entry.itemId } });
        } catch (e) {
          console.error("Error hard deleting booking:", e);
        }
      }
      if (entry.itemType === "product-order" || entry.itemType === "gift" || entry.itemType === "frame") {
        try {
          await prisma.productOrder.delete({ where: { id: entry.itemId } });
        } catch (e) {}
      }
    }

    await prisma.recycleBin.deleteMany({});

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_EMPTY",
        details: `Emptied recycle bin containing ${entries.length} items`,
        userId: (session.user as any).id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error emptying recycle bin:", error);
    return NextResponse.json({ error: "Failed to empty recycle bin" }, { status: 500 });
  }
}
