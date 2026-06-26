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
          console.error("Failed to restore transaction", e);
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
            const txIds = data.transactions.map((tx: any) => tx.id);
            await prisma.transaction.updateMany({
              where: { id: { in: txIds } },
              data: { deletedAt: null, productOrderId: entry.itemId }
            });
          } else {
            const fallbackString = data.orderNumber || entry.itemId.slice(-6).toUpperCase();
            await prisma.transaction.updateMany({
              where: { 
                description: { contains: fallbackString },
                deletedAt: { not: null } 
              },
              data: {
                deletedAt: null,
                productOrderId: entry.itemId
              }
            });
          }
        } catch (e) {
          console.error("Failed to restore product order", e);
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
    console.error("Error bulk restoring recycle bin:", error);
    return NextResponse.json({ error: "Failed to restore items" }, { status: 500 });
  }
}
