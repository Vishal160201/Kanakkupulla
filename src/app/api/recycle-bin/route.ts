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

    const whereClause: any = {
      restoredAt: null,
      permanentlyDeletedAt: null,
    };

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
        include: {
          trashedBy: { select: { name: true, email: true } },
        },
        orderBy: { trashedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.recycleBin.count({ where: whereClause }),
    ]);

    // Map items to standard format
    const formattedItems = items.map(item => {
      let entryName = "Unknown";
      const data: any = item.originalData || {};
      
      if (item.itemType === "booking") {
        entryName = data.bookingNumber || `Booking #${item.itemId.substring(0, 8)}`;
      } else if (item.itemType === "transaction") {
        entryName = data.transactionId || `${data.type} - ${data.category}`;
      } else if (item.itemType === "gift" || item.itemType === "frame" || item.itemType === "product-order") {
        entryName = data.clientName || `Order #${item.itemId.substring(0, 8)}`;
      }

      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        entryName,
        trashedBy: item.trashedBy?.name || item.trashedBy?.email || "Unknown",
        trashedAt: item.trashedAt,
        originalData: item.originalData
      };
    });

    return NextResponse.json({ items: formattedItems, total, limit, offset }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error fetching recycle bin:", error);
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
          await prisma.booking.delete({ where: { id: entry.itemId } });
        } catch (e) {
          // Ignore if already deleted
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
    console.error("Error bulk deleting recycle bin:", error);
    return NextResponse.json({ error: "Failed to delete items" }, { status: 500 });
  }
}
