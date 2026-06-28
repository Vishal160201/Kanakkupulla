import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueBookings = await prisma.booking.findMany({
      where: {
        status: "Confirmed",
        date: { lt: today },
        deletedAt: null,
      },
      include: {
        client: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(overdueBookings);
  } catch (error) {
    console.error("Error fetching overdue bookings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
