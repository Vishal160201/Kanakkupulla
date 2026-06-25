import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.productOrder.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    // Only allow specific fields to be updated via PATCH for safety
    const allowedUpdates: any = {};
    if (data.status) allowedUpdates.status = data.status;
    if (data.quantity !== undefined) allowedUpdates.quantity = data.quantity;
    if (data.clientName) allowedUpdates.clientName = data.clientName;
    if (data.clientPhone !== undefined) allowedUpdates.clientPhone = data.clientPhone;
    if (data.dueDate !== undefined) allowedUpdates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.customData) {
      // Fetch existing order to merge customData
      const existingOrder = await prisma.productOrder.findUnique({
        where: { id },
        select: { customData: true }
      });
      const currentCustomData = (existingOrder?.customData as any) || {};
      allowedUpdates.customData = { ...currentCustomData, ...data.customData };
    }

    const order = await prisma.productOrder.update({
      where: { id },
      data: allowedUpdates,
      include: { product: true, transactions: true }
    });

    // 2) Sync advance transaction if needed
    if (allowedUpdates.customData?.advanceAmount !== undefined || allowedUpdates.clientName) {
      const advanceTxUpdateData: any = {};
      if (allowedUpdates.customData?.advanceAmount !== undefined) {
        advanceTxUpdateData.amount = parseFloat(allowedUpdates.customData.advanceAmount) || 0;
      }
      if (allowedUpdates.clientName) {
        advanceTxUpdateData.description = `Advance Payment for Order ${order.id} - ${allowedUpdates.clientName}`;
      }

      if (Object.keys(advanceTxUpdateData).length > 0) {
        await prisma.transaction.updateMany({
          where: { productOrderId: order.id, description: { startsWith: 'Advance' } },
          data: advanceTxUpdateData
        });
      }
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: error.message || "Failed to update order" }, { status: 500 });
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
  const userId = (session.user as any).id as string;

  try {
    const { id } = await params;
    
    const existing = await prisma.productOrder.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await prisma.recycleBin.create({
      data: {
        itemType: "product-order",
        itemId: id,
        originalData: JSON.parse(JSON.stringify(existing)),
        trashedById: userId,
      }
    });

    // Delete associated transactions first to prevent foreign key constraint failures
    const txDeleteResult = await prisma.transaction.updateMany({
      where: { productOrderId: id },
      data: { deletedAt: new Date() }
    });
    console.log('softDelete result:', txDeleteResult.count);

    await prisma.productOrder.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
