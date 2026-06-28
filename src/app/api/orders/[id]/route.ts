import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            client: true
          }
        }
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
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
    const { packageAmount, advanceAmount, dueAmount } = body;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        package: packageAmount !== undefined ? parseFloat(packageAmount) : undefined,
        advance: advanceAmount !== undefined ? parseFloat(advanceAmount) : undefined,
        due: dueAmount !== undefined ? parseFloat(dueAmount) : undefined,
      },
    });

    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
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
    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
