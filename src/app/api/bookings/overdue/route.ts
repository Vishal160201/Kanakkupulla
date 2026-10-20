import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

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
      take: 200,
    });

    return NextResponse.json(overdueBookings);
  } catch (error) {
    console.error("Error fetching overdue bookings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
