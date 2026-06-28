import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    const trashedBy = searchParams.get("trashed_by");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const whereClause: any = {};

    if (source) whereClause.itemType = source;
    if (trashedBy) whereClause.trashedById = trashedBy;
    
    if (startDate || endDate) {
      whereClause.trashedAt = {};
      if (startDate) whereClause.trashedAt.gte = new Date(startDate);
      if (endDate) whereClause.trashedAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      prisma.recycleBin.findMany({
        where: whereClause,
        orderBy: { trashedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.recycleBin.count({ where: whereClause }),
    ]);

    const userIds = [...new Set(items.map(i => i.trashedById).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, name: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const clientIds = [...new Set(items.filter(i => i.itemType === 'booking').map(i => (i.originalData as any)?.clientId).filter(Boolean))];
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds as string[] } },
      select: { id: true, name: true }
    });
    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    // Map items to standard format
    const formattedItems = items.map(item => {
      let entryName = "Unknown";
      let transactionId = "-";
      let originalType = item.itemType;
      
      const data: any = item.originalData || {};
      const user = item.trashedById ? userMap.get(item.trashedById) : null;
      
      if (item.itemType === "booking") {
        const clientName = data.clientId ? clientMap.get(data.clientId) : null;
        entryName = clientName || data.clientName || data.eventName || `Booking`;
        transactionId = data.bookingNumber || item.itemId.substring(0, 8);
      } else if (item.itemType === "transaction") {
        entryName = data.category || "Transaction";
        transactionId = data.transactionId || "-";
        originalType = data.type || "transaction";
      } else if (item.itemType === "gift" || item.itemType === "frame" || item.itemType === "product-order") {
        entryName = data.customData?.clientName || data.clientName || `Order`;
        transactionId = data.orderNumber || data.orderId || item.itemId.substring(0, 8);
      }

      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        transactionId,
        originalType,
        entryName,
        trashedBy: user?.name || user?.email || item.trashedById || "Unknown",
        trashedAt: item.trashedAt,
        originalData: item.originalData
      };
    });

    return NextResponse.json({ items: formattedItems, total, limit, offset }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recycle bin" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
      // If booking, we also hard delete the booking itself if we are permanently deleting
      if (entry.itemType === "booking") {
        try {
          await prisma.transaction.deleteMany({ where: { bookingId: entry.itemId } });
          await prisma.order.deleteMany({ where: { bookingId: entry.itemId } });
          await prisma.booking.delete({ where: { id: entry.itemId } });
        } catch (e) {
        }
      }
      // Product orders if they use deletedAt
      if (entry.itemType === "product-order" || entry.itemType === "gift" || entry.itemType === "frame") {
        try {
          await prisma.productOrder.delete({ where: { id: entry.itemId } });
        } catch (e) {}
      }
    }

    // Now permanently delete the RecycleBin entries (or mark them)
    // Physically delete to save space
    await prisma.recycleBin.deleteMany({
      where: { id: { in: ids } }
    });

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_BULK_DELETE",
        details: `Permanently deleted ${ids.length} items from recycle bin`,
        userId: (session.user as any).id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete items" }, { status: 500 });
  }
}
