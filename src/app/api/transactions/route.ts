import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TRANSACTION_CATEGORIES, PAYMENT_MODES } from "@/lib/transactionConstants";
import { broadcastNotification } from "@/lib/notifications";

const PAGE_SIZE = 50;

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
    // P2: Cursor-based pagination
    const cursor = searchParams.get("cursor");

    let whereClause: any = {};
  // F6: Add userId filter using relation – supports both old and new generated client
  const userFilter = userId ? { user: { is: { id: userId } } } : undefined;

    // 1. Date Logic — F4: Fixed date mutation bug by NOT reusing the same `now` object
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date.gte = new Date(`${dateFrom}T00:00:00.000`);
      if (dateTo) whereClause.date.lte = new Date(`${dateTo}T23:59:59.999`);
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
    } else if (month) {
      const [year, mon] = month.split("-").map(Number);
      whereClause.date = {
        gte: new Date(year, mon - 1, 1),
        lt: new Date(year, mon, 1),
      };
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

    // P2: Paginate — fetch PAGE_SIZE + 1 to determine if there are more records
    const transactions = await prisma.transaction.findMany({
      where: { ...whereClause, userId },
      orderBy: { date: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = transactions.length > PAGE_SIZE;
    const items = hasMore ? transactions.slice(0, PAGE_SIZE) : transactions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // P3: FIXED - Changed from `public` to `private, no-store` to prevent CDN caching of financial data
    return NextResponse.json({ items, nextCursor, total: items.length }, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);

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
  // F6: User-scope writes
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const body = await request.json();
    const { amount, type, date, category, paymentMode, description, status } = body;

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
    if (!category || !(TRANSACTION_CATEGORIES as readonly string[]).includes(category)) {
      errors.category = `Category must be one of: ${TRANSACTION_CATEGORIES.join(", ")}.`;
    }
    if (!paymentMode || !(PAYMENT_MODES as readonly string[]).includes(paymentMode)) {
      errors.paymentMode = `Payment mode must be one of: ${PAYMENT_MODES.join(", ")}.`;
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", errors }, { status: 422 });
    }

    const newTransaction = await prisma.transaction.create({
      data: {
        amount: parsedAmount,
        type,
        date: new Date(date),
        category,
        paymentMode,
        description: description?.trim() || null,
        status: status || "SETTLED",
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });

    if (type === "INCOME") {
      await broadcastNotification(
        "Payment Received",
        `A payment of ₹${parsedAmount} was logged via ${paymentMode}.`,
        "PAYMENT",
        `/transactions`
      );
    }

    return NextResponse.json(newTransaction, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
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
    const { id, amount, type, date, category, paymentMode, description, status } = body;

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
      },
    });

    return NextResponse.json(updated, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
