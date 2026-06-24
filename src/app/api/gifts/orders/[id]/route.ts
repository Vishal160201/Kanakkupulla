import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.productOrder.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        transactions: true,
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Fetch order error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // Only allow specific fields to be updated via PATCH for safety
    const allowedUpdates: any = {};
    if (data.status) allowedUpdates.status = data.status;
    if (data.quantity !== undefined) allowedUpdates.quantity = data.quantity;
    if (data.clientName) allowedUpdates.clientName = data.clientName;
    if (data.clientPhone !== undefined) allowedUpdates.clientPhone = data.clientPhone;
    if (data.customData) allowedUpdates.customData = data.customData;

    const order = await prisma.productOrder.update({
      where: { id: params.id },
      data: allowedUpdates,
      include: { product: true, transactions: true }
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // We should first check if there are transactions, and handle them if needed.
    // For now, cascade delete or just delete the order (assuming transactions might prevent deletion if constrained)
    await prisma.productOrder.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
