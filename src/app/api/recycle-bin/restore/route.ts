import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 422 });
    }

    const entries = await prisma.recycleBin.findMany({
      where: { id: { in: ids } }
    });

    for (const entry of entries) {
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
            const fallbackString = data.orderNumber || entry.itemId.slice(-6).toUpperCase();
            await prisma.transaction.updateMany({
              where: { 
                description: { contains: fallbackString }
              },
              data: {
                deletedAt: null,
                productOrderId: entry.itemId
              }
            });
          }
        } catch (e) {
        }
      }
    }

    // Physically delete from recycle bin
    await prisma.recycleBin.deleteMany({
      where: { id: { in: ids } }
    });

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_BULK_RESTORE",
        details: `Restored ${ids.length} items from recycle bin`,
        userId: (session.user as any).id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to restore items" }, { status: 500 });
  }
}
