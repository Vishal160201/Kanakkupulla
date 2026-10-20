import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canWriteTransaction, forbiddenResponse, requireUser } from "@/lib/authz";
import { assertLedgerReadable } from "@/lib/ledgerAccess";
import { generateTransactionIds } from "@/lib/transactionId";
import { resolveShopForWrite, ShopError } from "@/lib/shops";
import { assertNotInventoryCategory } from "@/lib/ledgerSource";
import { parseJsonBody } from "@/lib/validations/http";
import { pickCustomFields } from "@/lib/validations/common";
import { bulkTransactionSchema } from "@/lib/validations/transactions";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { groupId } = await params;
    const transactions = await prisma.transaction.findMany({
      where: { groupId, deletedAt: null },
      orderBy: { createdAt: "asc" }
    });

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ error: "Transaction group not found" }, { status: 404 });
    }
    await assertLedgerReadable(auth.user, transactions[0].shopId);

    const firstTx = transactions[0];
    const categoryNames = transactions.map(tx => tx.category).join(', ');
    
    const combinedTransaction = {
      ...firstTx,
      id: groupId,
      category: categoryNames,
      amount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      items: transactions.map(tx => ({
        id: tx.id,
        transactionId: tx.transactionId,
        category: tx.category,
        amount: tx.amount
      }))
    };

    return NextResponse.json({ transaction: combinedTransaction }, { status: 200 });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to fetch transaction group:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  try {
    const { groupId } = await params;
    const parsed = await parseJsonBody(request, bulkTransactionSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    const existingTransactions = await prisma.transaction.findMany({
      where: { groupId, deletedAt: null },
      select: { id: true, category: true, shopId: true },
    });

    // A group lives in one shop: an explicit shop moves the whole group; otherwise new entries join
    // the group's current shop (or the default shop for a brand-new group).
    const requestedShopId = body[0]?.shopId;
    const currentShopId = existingTransactions[0]?.shopId;
    const shopId = requestedShopId && requestedShopId !== currentShopId
      ? await resolveShopForWrite(requestedShopId, undefined, auth.user)
      : currentShopId ?? (await resolveShopForWrite(undefined));
    const writable = await Promise.all(
      [...new Set([shopId, ...existingTransactions.map(tx => tx.shopId)])].map(id => canWriteTransaction(auth.user, { shopId: id }))
    );
    if (writable.includes(false)) return forbiddenResponse();
    await assertNotInventoryCategory(shopId, body.map(tx => tx.category), shopId === currentShopId ? existingTransactions.map(tx => tx.category) : []);

    const existingByCategory = new Map(existingTransactions.map(tx => [tx.category, tx]));
    // Mirrors the loop below: the first entry per existing category updates it, the rest are created.
    const unmatched = new Set(existingByCategory.keys());
    const newCount = body.filter(tx => !unmatched.delete(tx.category)).length;
    const newIds = await generateTransactionIds(newCount);

    const transactionsToUpdate = [];
    const transactionsToCreate = [];

    for (const tx of body) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- shopId is resolved once for the whole group
      const { amount, type, date, category, paymentMode, description, status, recordDate, shopId: _itemShopId, ...restBody } = tx;
      const customData = pickCustomFields(restBody);

      const payload = {
        amount,
        type,
        date: recordDate ?? date,
        category,
        paymentMode,
        description: description?.trim() || null,
        status: status || "SETTLED",
        customData: Object.keys(customData).length > 0 ? customData : undefined,
        shopId,
      };

      const existing = existingByCategory.get(category);
      if (existing) {
        transactionsToUpdate.push(prisma.transaction.update({
          where: { id: existing.id },
          data: payload
        }));
        existingByCategory.delete(category);
      } else {
        transactionsToCreate.push(prisma.transaction.create({
          data: {
            ...payload,
            transactionId: newIds[transactionsToCreate.length],
            userId,
            groupId
          }
        }));
      }
    }

    // Soft delete any removed categories
    const removedIds = Array.from(existingByCategory.values()).map(tx => tx.id);

    await prisma.$transaction([
      ...transactionsToUpdate,
      ...transactionsToCreate,
      prisma.transaction.updateMany({
        where: { id: { in: removedIds } },
        data: { deletedAt: new Date() }
      })
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to update bulk transactions:", error);
    return NextResponse.json({ error: "Failed to update bulk transactions." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  try {
    const { groupId } = await params;
    
    const transactions = await prisma.transaction.findMany({
      where: { groupId, deletedAt: null }
    });

    if (transactions.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (!(await canWriteTransaction(auth.user, { shopId: transactions[0].shopId }))) return forbiddenResponse();

    await prisma.transaction.updateMany({
      where: { id: { in: transactions.map(tx => tx.id) } },
      data: { deletedAt: new Date() },
    });

    // Create a single recycle bin entry for the group
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const categoryNames = transactions.map(tx => tx.category).join('+');
    
    await prisma.recycleBin.create({
      data: {
        itemId: groupId,
        itemType: "TRANSACTION_GROUP",
        trashedById: userId,
        originalData: JSON.parse(JSON.stringify({
          groupId,
          children: transactions,
          categoryNames,
          totalAmount
        }))
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to delete transaction group:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
