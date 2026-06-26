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
        console.log(`[DEBUG] (2) Exact order.id being used: ${entry.itemId}`);
        const debugTxs = await prisma.transaction.findMany({ where: { productOrderId: entry.itemId } });
        console.log(`[DEBUG] (1) Found by productOrderId:`, JSON.stringify(debugTxs, null, 2));
        
        const debugCols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Transaction'`;
        console.log(`[DEBUG] (3) Transaction columns:`, JSON.stringify(debugCols, null, 2));

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

        // Restore any associated transactions (find by description since productOrderId is nullified on cascade)
        // This MUST happen after productOrder is created to satisfy foreign key constraints.
        const txRestoreResult = await prisma.transaction.updateMany({
          where: { 
            description: { contains: entry.itemId },
            deletedAt: { not: null } 
          },
          data: { 
            deletedAt: null,
            productOrderId: entry.itemId
          }
        });
        
        const restoredTxs = await prisma.transaction.findMany({ where: { productOrderId: entry.itemId } });
        console.log(`Restore transactions result: ${txRestoreResult.count}`);
        restoredTxs.forEach(tx => {
           console.log('order.createdAt:', data.createdAt, 'transaction.date:', tx.date);
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
