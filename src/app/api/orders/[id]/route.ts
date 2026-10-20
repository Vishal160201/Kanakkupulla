import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess, requireOwner } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { orderUpdateSchema } from "@/lib/validations/orders";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("bookings", "VIEW");
  if (auth.error) return auth.error;

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
    console.error("Failed to fetch order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("bookings", "MANAGE");
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const parsed = await parseJsonBody(request, orderUpdateSchema);
    if (parsed.error) return parsed.error;
    const { packageAmount, advanceAmount, dueAmount } = parsed.data;

    const updated = await prisma.order.update({
      where: { id },
      data: { package: packageAmount, advance: advanceAmount, due: dueAmount },
    });

    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to delete order:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
