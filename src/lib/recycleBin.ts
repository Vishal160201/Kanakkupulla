import type { Prisma, RecycleBin } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getGoogleDriveToken, type DriveSession } from "@/lib/googleDriveAuth";
import { roleHasPermission, type SessionUser } from "@/lib/authz";
import { getDefaultShopId } from "@/lib/shops";

export const PRODUCT_ORDER_TYPES = ["product-order", "gift", "frame"];

/** Item types only their owner may see, restore or purge. */
export const PRIVATE_ITEM_TYPES = ["PERSONAL_EXPENSE"];

export function canAccessEntry(entry: Pick<RecycleBin, "itemType" | "trashedById">, userId: string) {
  return !PRIVATE_ITEM_TYPES.includes(entry.itemType) || entry.trashedById === userId;
}

/** Restoring needs the same permission as editing the item; private items only need ownership. */
export async function canRestoreEntry(entry: Pick<RecycleBin, "itemType" | "trashedById">, user: SessionUser) {
  if (PRIVATE_ITEM_TYPES.includes(entry.itemType)) return entry.trashedById === user.id;
  if (entry.itemType === "transaction" || entry.itemType === "TRANSACTION_GROUP") {
    return roleHasPermission(user.role, "manage_transactions");
  }
  return roleHasPermission(user.role, "manage_bookings");
}

/**
 * Soft-deletes a booking together with its live transactions and records it in the recycle bin.
 * The trashed transaction ids are kept in the snapshot so a restore brings back exactly those.
 */
export async function trashBooking(id: string, userId: string | null) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return false;

  const liveTransactions = await prisma.transaction.findMany({
    where: { bookingId: id, deletedAt: null },
    select: { id: true },
  });
  const trashedTransactionIds = liveTransactions.map(t => t.id);
  const now = new Date();

  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { deletedAt: now } }),
    prisma.transaction.updateMany({ where: { id: { in: trashedTransactionIds } }, data: { deletedAt: now } }),
    prisma.recycleBin.create({
      data: {
        itemType: "booking",
        itemId: id,
        originalData: JSON.parse(JSON.stringify({ ...existing, trashedTransactionIds })),
        trashedById: userId || "System",
      },
    }),
    prisma.systemLog.create({
      data: { action: "BOOKING_SOFT_DELETED", details: `Soft deleted booking ID: ${id}`, userId },
    }),
  ]);
  return true;
}

// Shapes of the JSON snapshots stored in RecycleBin.originalData (dates arrive as ISO strings).
type JsonInput = Prisma.InputJsonValue | null;
type TransactionSnapshot = {
  id: string;
  transactionId?: string | null;
  amount: number;
  type: string;
  date: string;
  category: string;
  paymentMode: string;
  description?: string | null;
  status?: string;
  attachmentUrl?: string | null;
  customData?: JsonInput;
  bookingId?: string | null;
  groupId?: string | null;
  shopId?: string | null;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};
type ProductOrderSnapshot = {
  id: string;
  orderNumber?: string | null;
  productId: string;
  quantity?: number;
  status?: string;
  clientName: string;
  clientPhone?: string | null;
  customData?: JsonInput;
  discountAmount?: number;
  date?: string;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  transactions?: TransactionSnapshot[];
};
type Snapshot = Partial<ProductOrderSnapshot> & {
  trashedTransactionIds?: string[];
  children?: TransactionSnapshot[];
  attachmentUrl?: string | null;
};

const snapshotOf = (entry: RecycleBin) => (entry.originalData ?? {}) as unknown as Snapshot;
const toDate = (value: string | null | undefined) => (value ? new Date(value) : undefined);

/** Restores one recycle-bin entry and removes it from the bin. */
export async function restoreEntry(entry: RecycleBin) {
  const data = snapshotOf(entry);

  if (entry.itemType === "booking") {
    const txIds: string[] = Array.isArray(data.trashedTransactionIds) ? data.trashedTransactionIds : [];
    await prisma.$transaction([
      prisma.booking.update({ where: { id: entry.itemId }, data: { deletedAt: null } }),
      prisma.transaction.updateMany({ where: { id: { in: txIds } }, data: { deletedAt: null } }),
      prisma.recycleBin.delete({ where: { id: entry.id } }),
    ]);
    return;
  }

  if (entry.itemType === "transaction" || entry.itemType === "PERSONAL_EXPENSE") {
    await prisma.$transaction([
      prisma.transaction.update({ where: { id: entry.itemId }, data: { deletedAt: null } }),
      prisma.recycleBin.delete({ where: { id: entry.id } }),
    ]);
    return;
  }

  if (entry.itemType === "TRANSACTION_GROUP") {
    const ids = (data.children || []).map(tx => tx.id).filter(Boolean);
    await prisma.$transaction([
      prisma.transaction.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null } }),
      prisma.recycleBin.delete({ where: { id: entry.id } }),
    ]);
    return;
  }

  if (PRODUCT_ORDER_TYPES.includes(entry.itemType)) {
    // Product orders are hard-deleted when trashed, so they are recreated from the snapshot.
    // Transactions that were already trashed on their own stay trashed
    const order = data as ProductOrderSnapshot;
    const transactions = Array.isArray(order.transactions) ? order.transactions.filter(t => !t.deletedAt) : [];
    await prisma.$transaction(async tx => {
      // Snapshots from before shops existed have no shopId, and a snapshot's shop may since have
      // been deleted (its entries were removed with the order), so fall back to the default shop.
      const snapshotShopIds = [...new Set(transactions.map(t => t.shopId).filter((id): id is string => !!id))];
      const existingShopIds = new Set(
        (await tx.shop.findMany({ where: { id: { in: snapshotShopIds } }, select: { id: true } })).map(s => s.id)
      );
      const defaultShopId = transactions.length > 0 ? await getDefaultShopId(tx) : "";

      await tx.productOrder.create({
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          productId: order.productId,
          quantity: order.quantity,
          status: order.status,
          clientName: order.clientName,
          clientPhone: order.clientPhone,
          customData: order.customData ?? undefined,
          discountAmount: order.discountAmount ?? undefined,
          date: toDate(order.date),
          dueDate: toDate(order.dueDate),
          createdAt: toDate(order.createdAt),
          updatedAt: toDate(order.updatedAt),
        },
      });

      for (const t of transactions) {
        await tx.transaction.upsert({
          where: { id: t.id },
          update: { deletedAt: null, productOrderId: entry.itemId },
          create: {
            id: t.id,
            transactionId: t.transactionId,
            amount: t.amount,
            type: t.type,
            date: new Date(t.date),
            category: t.category,
            paymentMode: t.paymentMode,
            description: t.description,
            status: t.status,
            attachmentUrl: t.attachmentUrl,
            customData: t.customData ?? undefined,
            bookingId: t.bookingId,
            groupId: t.groupId,
            shopId: t.shopId && existingShopIds.has(t.shopId) ? t.shopId : defaultShopId,
            productOrderId: entry.itemId,
            userId: t.userId,
            createdAt: toDate(t.createdAt),
            updatedAt: toDate(t.updatedAt),
          },
        });
      }

      await tx.recycleBin.delete({ where: { id: entry.id } });
    });
    return;
  }

  // Unknown type: nothing to restore, just drop the entry.
  await prisma.recycleBin.delete({ where: { id: entry.id } });
}

function driveFileIdsFor(entry: RecycleBin): string[] {
  const data = snapshotOf(entry);
  // Attachment fields in customData are stored as { id, name, ... } Drive file objects
  const fromCustomData = (customData: JsonInput | undefined): string[] =>
    customData && typeof customData === "object" && !Array.isArray(customData)
      ? Object.values(customData).flatMap(v =>
          v && typeof v === "object" && !Array.isArray(v) && typeof (v as { id?: unknown }).id === "string"
            ? [(v as { id: string }).id]
            : []
        )
      : [];

  if (PRODUCT_ORDER_TYPES.includes(entry.itemType)) return fromCustomData(data.customData);
  if (entry.itemType === "transaction") return fromCustomData(data.customData);
  if (entry.itemType === "TRANSACTION_GROUP") return (data.children || []).flatMap(c => fromCustomData(c.customData));
  if (entry.itemType === "PERSONAL_EXPENSE" && typeof data.attachmentUrl === "string" && data.attachmentUrl.includes("drive.google.com")) {
    const match = data.attachmentUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || data.attachmentUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? [match[1]] : [];
  }
  return [];
}

async function deleteDriveFiles(fileIds: string[], session: DriveSession) {
  if (fileIds.length === 0 || !session) return;
  let accessToken: string;
  try {
    accessToken = await getGoogleDriveToken(session);
  } catch {
    return;
  }
  for (const fileId of fileIds) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok && res.status !== 404) console.error(`Failed to delete drive file ${fileId}:`, await res.text());
    } catch (err) {
      console.error(`Error deleting drive file ${fileId}:`, err);
    }
  }
}

/**
 * Permanently deletes the item behind a recycle-bin entry, then the entry itself.
 * Pass the session to also delete attached Google Drive files (cron purges skip that).
 */
export async function purgeEntry(entry: RecycleBin, session?: DriveSession) {
  await deleteDriveFiles(driveFileIdsFor(entry), session);

  const ops = [];
  if (entry.itemType === "booking") {
    ops.push(
      prisma.transaction.deleteMany({ where: { bookingId: entry.itemId } }),
      prisma.order.deleteMany({ where: { bookingId: entry.itemId } }),
      prisma.invoice.deleteMany({ where: { bookingId: entry.itemId } }),
      prisma.booking.deleteMany({ where: { id: entry.itemId } }),
    );
  } else if (PRODUCT_ORDER_TYPES.includes(entry.itemType)) {
    ops.push(
      prisma.transaction.deleteMany({ where: { productOrderId: entry.itemId } }),
      prisma.productOrder.deleteMany({ where: { id: entry.itemId } }),
    );
  } else if (entry.itemType === "TRANSACTION_GROUP") {
    ops.push(prisma.transaction.deleteMany({ where: { groupId: entry.itemId, deletedAt: { not: null } } }));
  } else if (entry.itemType === "transaction" || entry.itemType === "PERSONAL_EXPENSE") {
    ops.push(prisma.transaction.deleteMany({ where: { id: entry.itemId, deletedAt: { not: null } } }));
  }
  ops.push(prisma.recycleBin.deleteMany({ where: { id: entry.id } }));

  await prisma.$transaction(ops);
}
