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
      try {
        await prisma.transaction.update({
          where: { id: entry.itemId },
          data: { deletedAt: null }
        });
      } catch (e) {
        return NextResponse.json({ error: "Failed to restore transaction" }, { status: 500 });
      }
      } else if (entry.itemType === "TRANSACTION_GROUP") {
        const data: any = entry.originalData;
        const transactions = data.children || [];
        for (const tx of transactions) {
          try {
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { deletedAt: null }
            });
          } catch (e) {}
        }
      } else if (entry.itemType === "product-order" || entry.itemType === "gift" || entry.itemType === "frame") {
      const data: any = entry.originalData;
      try {
        const debugTxs = await prisma.transaction.findMany({ where: { productOrderId: entry.itemId } });
        
        const debugCols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Transaction'`;

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

        // Restore any associated transactions
        if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0) {
          for (const tx of data.transactions) {
            try {
              await prisma.transaction.upsert({
                where: { id: tx.id },
                update: { deletedAt: null, productOrderId: entry.itemId },
                create: {
                  id: tx.id,
                  transactionId: tx.transactionId,
                  amount: tx.amount,
                  type: tx.type,
                  date: new Date(tx.date),
                  category: tx.category,
                  paymentMode: tx.paymentMode,
                  description: tx.description,
                  status: tx.status,
                  attachmentUrl: tx.attachmentUrl,
                  customData: tx.customData,
                  bookingId: tx.bookingId,
                  productOrderId: entry.itemId,
                  userId: tx.userId,
                  createdAt: tx.createdAt ? new Date(tx.createdAt) : undefined,
                  updatedAt: tx.updatedAt ? new Date(tx.updatedAt) : undefined,
                }
              });
            } catch (e) {
            }
          }
        } else {
          // Fallback for orders that were deleted before transactions were included in originalData
          const fallbackString = data.orderNumber || entry.itemId.slice(-6).toUpperCase();
          const txRestoreResult = await prisma.transaction.updateMany({
            where: { 
              description: { contains: fallbackString }
            },
            data: {
              deletedAt: null,
              productOrderId: entry.itemId
            }
          });
        }
        
        const restoredTxs = await prisma.transaction.findMany({ where: { productOrderId: entry.itemId } });
        restoredTxs.forEach(tx => {
        });
      } catch (e) {
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
    return NextResponse.json({ error: "Failed to restore item" }, { status: 500 });
  }
}
