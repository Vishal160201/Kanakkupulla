import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateNextTransactionId } from "@/lib/transactionId";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { groupId } = await params;
    const transactions = await prisma.transaction.findMany({
      where: { groupId, deletedAt: null },
      orderBy: { createdAt: "asc" }
    });

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ error: "Transaction group not found" }, { status: 404 });
    }

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch group", details: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const { groupId } = await params;
    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array of transactions for bulk update" }, { status: 400 });
    }

    if (body.length === 0) {
      return NextResponse.json({ error: "No transactions provided" }, { status: 400 });
    }

    const types = new Set(body.map(tx => tx.type));
    if (types.size > 1) {
      return NextResponse.json({ error: "All categories must be same type" }, { status: 422 });
    }

    const existingTransactions = await prisma.transaction.findMany({
      where: { groupId, deletedAt: null }
    });

    const existingByCategory = new Map(existingTransactions.map(tx => [tx.category, tx]));
    
    const transactionsToUpdate = [];
    const transactionsToCreate = [];
    
    for (let i = 0; i < body.length; i++) {
      const tx = body[i];
      const { amount, type, date, category, paymentMode, description, status, recordDate, ...restBody } = tx;

      const customData: Record<string, any> = {};
      for (const [key, value] of Object.entries(restBody)) {
        if (key !== 'id' && key !== 'userId' && key !== 'recordDate' && !key.startsWith('$ACTION')) {
          customData[key] = value;
        }
      }

      const parsedAmount = parseFloat(amount);
      if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: `Amount must be a positive number for category ${category}.` }, { status: 422 });
      }
      
      const payload = {
        amount: parsedAmount,
        type,
        date: recordDate ? new Date(recordDate) : new Date(date),
        category,
        paymentMode,
        description: description?.trim() || null,
        status: status || "SETTLED",
        customData: Object.keys(customData).length > 0 ? customData : undefined,
      };

      if (existingByCategory.has(category)) {
        const existingId = existingByCategory.get(category)!.id;
        transactionsToUpdate.push(prisma.transaction.update({
          where: { id: existingId },
          data: payload
        }));
        existingByCategory.delete(category);
      } else {
        const transactionId = await generateNextTransactionId();
        transactionsToCreate.push(prisma.transaction.create({
          data: {
            ...payload,
            transactionId,
            ...(userId ? { user: { connect: { id: userId } } } : {}),
            groupId
          }
        }));
      }
    }

    // Soft delete any removed categories
    const transactionsToDelete = Array.from(existingByCategory.values()).map(tx => 
      prisma.transaction.update({
        where: { id: tx.id },
        data: { deletedAt: new Date() }
      })
    );

    await prisma.$transaction([
      ...transactionsToUpdate,
      ...transactionsToCreate,
      ...transactionsToDelete
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update bulk transactions.", details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const { groupId } = await params;
    
    const transactions = await prisma.transaction.findMany({
      where: { groupId, deletedAt: null }
    });

    if (transactions.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const now = new Date();
    await prisma.$transaction(
      transactions.map(tx => prisma.transaction.update({
        where: { id: tx.id },
        data: { deletedAt: now }
      }))
    );

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete group", details: String(error) }, { status: 500 });
  }
}
