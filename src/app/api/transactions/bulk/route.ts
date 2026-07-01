import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateNextTransactionId } from "@/lib/transactionId";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array of transactions" }, { status: 400 });
    }

    if (body.length === 0) {
      return NextResponse.json({ error: "No transactions provided" }, { status: 400 });
    }

    const types = new Set(body.map((tx: any) => tx.type));
    if (types.size > 1) {
      return NextResponse.json({ error: "All categories must be same type" }, { status: 422 });
    }

    // Generate a unique groupId for this bulk operation
    const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const transactionsData = [];

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
      if (!type || !["INCOME", "EXPENSE"].includes(type)) {
        return NextResponse.json({ error: "Type must be INCOME or EXPENSE." }, { status: 422 });
      }
      if (!date || isNaN(new Date(date).getTime())) {
        return NextResponse.json({ error: "A valid date is required." }, { status: 422 });
      }
      if (!category) {
        return NextResponse.json({ error: "Category is required." }, { status: 422 });
      }
      if (!paymentMode) {
        return NextResponse.json({ error: "Payment mode is required." }, { status: 422 });
      }

      const transactionId = await generateNextTransactionId(); // Generating unique ID for each
      
      transactionsData.push({
        transactionId,
        amount: parsedAmount,
        type,
        date: recordDate ? new Date(recordDate) : new Date(date),
        category,
        paymentMode,
        description: description?.trim() || null,
        status: status || "SETTLED",
        customData: Object.keys(customData).length > 0 ? customData : undefined,
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        groupId: groupId
      });
    }

    // Insert all transactions atomically
    const newTransactions = await prisma.$transaction(
      transactionsData.map(data => prisma.transaction.create({ data }))
    );

    return NextResponse.json(newTransactions, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to bulk create transactions.", details: String(error) }, { status: 500 });
  }
}
