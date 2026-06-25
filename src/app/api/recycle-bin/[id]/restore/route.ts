import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
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
      await prisma.booking.update({
        where: { id: entry.itemId },
        data: { deletedAt: null }
      });
    } else if (entry.itemType === "transaction") {
      const data: any = entry.originalData;
      try {
        await prisma.transaction.create({
          data: {
            id: data.id,
            transactionId: data.transactionId,
            amount: data.amount,
            type: data.type,
            date: new Date(data.date),
            category: data.category,
            paymentMode: data.paymentMode,
            description: data.description,
            status: data.status,
            attachmentUrl: data.attachmentUrl,
            customData: data.customData,
            bookingId: data.bookingId,
            userId: data.userId,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
          }
        });
      } catch (e) {
        console.error("Failed to restore transaction", e);
        return NextResponse.json({ error: "Failed to restore transaction" }, { status: 500 });
      }
    } else if (entry.itemType === "product-order" || entry.itemType === "gift" || entry.itemType === "frame") {
      const data: any = entry.originalData;
      try {
        // Restore any associated transactions
        const txRestoreResult = await prisma.transaction.updateMany({
          where: { productOrderId: entry.itemId, deletedAt: { not: null } },
          data: { deletedAt: null }
        });
        console.log(`Restore transactions result: ${txRestoreResult.count}`);

        await prisma.productOrder.create({
          data: {
            id: data.id,
            orderNumber: data.orderNumber,
            productId: data.productId,
            quantity: data.quantity,
            status: data.status,
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            customData: data.customData,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
          }
        });
      } catch (e) {
        console.error("Failed to restore product order", e);
        return NextResponse.json({ error: "Failed to restore product order" }, { status: 500 });
      }
    }

    // Physically delete from recycle bin
    await prisma.recycleBin.delete({ where: { id } });

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_RESTORE",
        details: `Restored item ${id} from recycle bin`,
        userId: (session.user as any).id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring recycle bin item:", error);
    return NextResponse.json({ error: "Failed to restore item" }, { status: 500 });
  }
}
