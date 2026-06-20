import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        booking: {
          include: {
            client: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { bookingId, packageAmount, advanceAmount, dueAmount } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 422 });
    }

    const newOrder = await prisma.order.create({
      data: {
        bookingId,
        package: parseFloat(packageAmount || 0),
        advance: parseFloat(advanceAmount || 0),
        due: parseFloat(dueAmount || 0),
      },
    });

    return NextResponse.json(newOrder, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
