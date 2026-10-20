import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/authz";
import { broadcastNotification } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";
import { parseJsonBody } from "@/lib/validations/http";
import { asJsonRecord, type JsonRecord } from "@/lib/validations/common";
import { giftOrderPatchSchema } from "@/lib/validations/gifts";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const order = await prisma.productOrder.findUnique({
      where: { id },
      include: {
        product: true,
        transactions: { where: { deletedAt: null } },
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Failed to fetch gift order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manage_bookings");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const parsed = await parseJsonBody(request, giftOrderPatchSchema);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    // Only allow specific fields to be updated via PATCH for safety
    const allowedUpdates: Prisma.ProductOrderUpdateInput = {};
    let mergedCustomData: JsonRecord | undefined;
    if (data.status) allowedUpdates.status = data.status;
    if (data.quantity !== undefined) allowedUpdates.quantity = data.quantity;
    if (data.clientName) allowedUpdates.clientName = data.clientName;
    if (data.clientPhone !== undefined) allowedUpdates.clientPhone = data.clientPhone;
    if (data.dueDate !== undefined) allowedUpdates.dueDate = data.dueDate;
    if (data.discountAmount !== undefined) allowedUpdates.discountAmount = data.discountAmount;
    if (data.customData) {
      // Fetch existing order to merge customData
      const existingOrder = await prisma.productOrder.findUnique({
        where: { id },
        select: { customData: true }
      });
      mergedCustomData = { ...asJsonRecord(existingOrder?.customData), ...data.customData };
      allowedUpdates.customData = mergedCustomData;
    }

    const order = await prisma.productOrder.update({
      where: { id },
      data: allowedUpdates,
      include: { product: true, transactions: true }
    });

    // 2) Sync advance transaction if needed
    const newAdvance = mergedCustomData?.advanceAmount;
    if (newAdvance !== undefined || data.clientName) {
      const advanceTxUpdateData: Prisma.TransactionUpdateManyMutationInput = {};
      if (newAdvance !== undefined) {
        advanceTxUpdateData.amount = parseFloat(String(newAdvance)) || 0;
      }
      if (data.clientName) {
        advanceTxUpdateData.description = `Advance Payment for Order ${order.orderNumber || `#MDorder-${order.id.slice(-6).toUpperCase()}`} - ${data.clientName}`;
      }

      if (Object.keys(advanceTxUpdateData).length > 0) {
        await prisma.transaction.updateMany({
          where: { 
            productOrderId: order.id, 
            OR: [
              { description: { startsWith: 'Advance' } },
              { description: { startsWith: 'Full Payment' } }
            ]
          },
          data: advanceTxUpdateData
        });
        
      }
    }

    if (data.status) {
      const typeStr = data.status === "DELIVERED" ? "ORDER_DELIVERED" : "ORDER_STATUS_CHANGED";
      broadcastNotification({
        title: "Order Status Updated",
        message: `Order ${order.orderNumber || `#MDorder-${order.id.slice(-6).toUpperCase()}`} is now ${data.status}.`,
        type: typeStr,
        actionUrl: `/gifts`,
        entityId: order.id,
        entityType: "order"
      }).catch(console.error);
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Failed to update product order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manage_bookings");
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  try {
    const { id } = await params;
    
    const existing = await prisma.productOrder.findUnique({
      where: { id },
      include: { transactions: true }
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Product orders have no deletedAt column: snapshot the order with its transactions, then remove both.
    await prisma.$transaction([
      prisma.recycleBin.create({
        data: {
          itemType: "product-order",
          itemId: id,
          originalData: JSON.parse(JSON.stringify(existing)),
          trashedById: userId,
        }
      }),
      prisma.transaction.deleteMany({
        where: { productOrderId: id }
      }),
      prisma.productOrder.delete({
        where: { id }
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete gift order:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
