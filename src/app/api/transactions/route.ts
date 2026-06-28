import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { broadcastNotification } from "@/lib/notifications";
import { generateNextTransactionId } from "@/lib/transactionId";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  // F6: User-scope all queries
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // format: 'YYYY-MM'
    const category = searchParams.get("categories");
    const view = searchParams.get("view"); // 'day', 'week', 'month'
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const amountMin = searchParams.get("amountMin");
    const amountMax = searchParams.get("amountMax");
    const legacyCategory = searchParams.get("category");
    const type = searchParams.get("type");
    const paymentMode = searchParams.get("paymentMode");

    const whereClause: any = { deletedAt: null };
    // 1. Date Logic — F4: Fixed date mutation bug by NOT reusing the same `now` object
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date.gte = new Date(`${dateFrom}T00:00:00.000`);
      if (dateTo) whereClause.date.lte = new Date(`${dateTo}T23:59:59.999`);
    } else if (month) {
      const [year, mon] = month.split("-").map(Number);
      whereClause.date = {
        gte: new Date(year, mon - 1, 1),
        lt: new Date(year, mon, 1),
      };
    } else if (view) {
      const now = new Date();
      if (view === "day") {
        // F4 FIX: Create two independent date objects instead of mutating one
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        whereClause.date = { gte: start, lte: end };
      } else if (view === "week") {
        const dayOfWeek = now.getDay();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 6, 23, 59, 59, 999);
        whereClause.date = { gte: start, lte: end };
      } else if (view === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        whereClause.date = { gte: start, lte: end };
      }
    }

    // 2. Category Logic
    const activeCategories = category
      ? category.split(",").map((c) => c.trim()).filter(Boolean)
      : legacyCategory && legacyCategory !== "All"
      ? [legacyCategory]
      : [];
    if (activeCategories.length > 0) {
      whereClause.category = { in: activeCategories };
    }

    // 3. Amount Logic
    if (amountMin || amountMax) {
      whereClause.amount = {};
      if (amountMin) whereClause.amount.gte = parseFloat(amountMin);
      if (amountMax) whereClause.amount.lte = parseFloat(amountMax);
    }

    // 4. Type and PaymentMode Logic
    if (type && type !== "ALL") whereClause.type = type;
    if (paymentMode && paymentMode !== "ALL") whereClause.paymentMode = paymentMode;

    // P2: Offset-based pagination (cursor on non-unique sort leads to duplicates)
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    
    
    const transactions = await prisma.transaction.findMany({
      where: { 
        ...whereClause
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" }
      ],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    });

    const total = await prisma.transaction.count({
      where: { ...whereClause },
    });

    return NextResponse.json({ items: transactions, total, page, pageSize: PAGE_SIZE }, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {

    if (
      error.message?.toLowerCase().includes("timeout") ||
      error.message?.toLowerCase().includes("connection")
    ) {
      return NextResponse.json(
        { error: "Service temporarily overloaded. Please try again." },
        { status: 503, headers: { "Retry-After": "5" } }
      );
    }

    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // F6: User-scope writes
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    const body = await request.json();
    const { amount, type, date, category, paymentMode, description, status, productOrderId, bookingId, recordDate, ...restBody } = body;

    const customData: Record<string, any> = {};
    for (const [key, value] of Object.entries(restBody)) {
      if (key !== 'id' && key !== 'userId' && key !== 'recordDate' && !key.startsWith('$ACTION')) {
        customData[key] = value;
      }
    }

    // F2: Server-side validation
    const errors: Record<string, string> = {};
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Amount must be a positive number.";
    }
    if (!type || !["INCOME", "EXPENSE"].includes(type)) {
      errors.type = "Type must be INCOME or EXPENSE.";
    }
    if (!date || isNaN(new Date(date).getTime())) {
      errors.date = "A valid date is required.";
    }
    if (!category) {
      errors.category = `Category is required.`;
    }
    if (!paymentMode) {
      errors.paymentMode = `Payment mode is required.`;
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", errors }, { status: 422 });
    }

    const transactionId = await generateNextTransactionId();

    const newTransaction = await prisma.transaction.create({
      data: {
        transactionId,
        amount: parsedAmount,
        type,
        date: recordDate ? new Date(recordDate) : new Date(date),
        category,
        paymentMode,
        description: description?.trim() || null,
        status: status || "SETTLED",
        ...(productOrderId ? { productOrder: { connect: { id: productOrderId } } } : {}),
        bookingId: bookingId || undefined,
        customData: Object.keys(customData).length > 0 ? customData : undefined,
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });

    if (type === "INCOME") {
      // Fire and forget so we don't block the UI
      broadcastNotification(
        "Payment Received",
        `A payment of ₹${parsedAmount} was logged via ${paymentMode}.`,
        "PAYMENT",
        `/transactions`,
        userId
      ).catch(console.error);
    }

    return NextResponse.json(newTransaction, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create transaction.", details: String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const body = await request.json();
    const { id, amount, type, date, category, paymentMode, description, status, ...restBody } = body;

    if (!id) return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });

    // Confirm the transaction belongs to this user
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const errors: Record<string, string> = {};
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) errors.amount = "Amount must be a positive number.";
    if (!type || !["INCOME", "EXPENSE"].includes(type)) errors.type = "Invalid type.";
    if (!date || isNaN(new Date(date).getTime())) errors.date = "A valid date is required.";

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", errors }, { status: 422 });
    }

    const customData: Record<string, any> = existing.customData && typeof existing.customData === 'object' ? { ...(existing.customData as any) } : {};
    for (const [key, value] of Object.entries(restBody)) {
      if (key !== 'userId' && !key.startsWith('$ACTION')) {
        customData[key] = value;
      }
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        amount: parsedAmount,
        type,
        date: new Date(date),
        category: category || existing.category,
        paymentMode: paymentMode || existing.paymentMode,
        description: description?.trim() || null,
        status: status || existing.status,
        customData: Object.keys(customData).length > 0 ? customData : undefined,
      },
    });

    return NextResponse.json(updated, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
