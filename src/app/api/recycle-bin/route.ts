import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess, requireOwner } from "@/lib/authz";
import { canAccessEntry, purgeEntry } from "@/lib/recycleBin";
import type { Prisma } from "@prisma/client";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { asJsonRecord, type JsonValue } from "@/lib/validations/common";
import { recycleBinIdsSchema, recycleBinListQuerySchema } from "@/lib/validations/recycleBin";

const str = (value: JsonValue | undefined): string | undefined =>
  typeof value === "string" && value ? value : undefined;

/** Children of a TRANSACTION_GROUP snapshot, as plain objects. */
const groupChildren = (value: JsonValue | undefined) =>
  Array.isArray(value) ? value.map(child => asJsonRecord(child)) : [];

export async function GET(request: Request) {
  const auth = await requireAccess("recycle_bin", "VIEW");
  if (auth.error) return auth.error;
  const user = auth.user;

  const query = parseSearchParams(request, recycleBinListQuerySchema);
  if (query.error) return query.error;
  const { source, trashed_by: trashedBy, startDate, endDate, limit, offset } = query.data;

  try {
    const whereClause: Prisma.RecycleBinWhereInput = {};

    if (source) whereClause.itemType = source;
    if (trashedBy) whereClause.trashedById = trashedBy;
    
    // Personal expenses are private to whoever trashed them
    if (source === 'PERSONAL_EXPENSE') {
      whereClause.trashedById = user.id;
    } else if (!source) {
      whereClause.OR = [{ itemType: { not: 'PERSONAL_EXPENSE' } }, { trashedById: user.id }];
    }
    
    if (startDate || endDate) {
      whereClause.trashedAt = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
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

    const userIds = [...new Set(items.flatMap(i => (i.trashedById ? [i.trashedById] : [])))];
    const clientIds = [...new Set(items
      .filter(i => i.itemType === 'booking')
      .flatMap(i => {
        const clientId = str(asJsonRecord(i.originalData).clientId);
        return clientId ? [clientId] : [];
      }))];
    const [users, clients] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      }),
      prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true }
      }),
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    // Map items to standard format
    const formattedItems = items.map(item => {
      let entryName = "Unknown";
      let transactionId = "-";
      let originalType = item.itemType;

      const data = asJsonRecord(item.originalData);
      const user = item.trashedById ? userMap.get(item.trashedById) : null;

      if (item.itemType === "booking") {
        const clientId = str(data.clientId);
        const clientName = clientId ? clientMap.get(clientId) : null;
        entryName = clientName || str(data.clientName) || str(data.eventName) || `Booking`;
        transactionId = str(data.bookingNumber) || item.itemId.substring(0, 8);
      } else if (item.itemType === "transaction") {
        entryName = str(data.category) || "Transaction";
        transactionId = str(data.transactionId) || "-";
        originalType = str(data.type) || "transaction";
      } else if (item.itemType === "TRANSACTION_GROUP") {
        const children = groupChildren(data.children);
        entryName = children.map(c => c.category).join(', ') || "Transaction Group";
        transactionId = children.map(c => c.transactionId).join(', ') || "-";
        originalType = str(children[0]?.type) || "TRANSACTION_GROUP";
      } else if (item.itemType === "gift" || item.itemType === "frame" || item.itemType === "product-order") {
        entryName = str(asJsonRecord(data.customData).clientName) || str(data.clientName) || `Order`;
        transactionId = str(data.orderNumber) || str(data.orderId) || item.itemId.substring(0, 8);
      } else if (item.itemType === "PERSONAL_EXPENSE") {
        entryName = str(data.title) || "Personal Expense";
        transactionId = "-";
        originalType = str(data.type) || "EXPENSE";
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
    console.error("Failed to fetch recycle bin:", error);
    return NextResponse.json({ error: "Failed to fetch recycle bin" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  // Drive deletes run as the acting admin
  const session = { user: auth.user };

  try {
    const parsed = await parseJsonBody(request, recycleBinIdsSchema);
    if (parsed.error) return parsed.error;
    const { ids } = parsed.data;

    const entries = (await prisma.recycleBin.findMany({
      where: { id: { in: ids } }
    })).filter(entry => canAccessEntry(entry, auth.user.id));

    for (const entry of entries) {
      await purgeEntry(entry, session);
    }

    await prisma.systemLog.create({
      data: {
        action: "RECYCLE_BIN_BULK_DELETE",
        details: `Permanently deleted ${entries.length} items from recycle bin`,
        userId: auth.user.id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete recycle bin items:", error);
    return NextResponse.json({ error: "Failed to delete items" }, { status: 500 });
  }
}
