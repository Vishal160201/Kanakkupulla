import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastNotification } from "@/lib/notifications";
import { generateNextTransactionId } from "@/lib/transactionId";
import { resolveShopForWrite, shopSummarySelect, shopWhere, ShopError } from "@/lib/shops";
import { canWriteTransaction, forbiddenResponse, requirePermission, requireUser } from "@/lib/authz";
import type { Prisma } from "@prisma/client";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { asJsonRecord, pickCustomFields } from "@/lib/validations/common";
import {
  transactionCreateSchema,
  transactionListQuerySchema,
  transactionReplaceSchema,
} from "@/lib/validations/transactions";


const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const auth = await requirePermission("view_transactions", "manage_transactions");
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, transactionListQuerySchema);
  if (query.error) return query.error;
  const { month, categories: category, view, dateFrom, dateTo, amountMin, amountMax, category: legacyCategory, type, paymentMode, page, shopId } = query.data;

  try {
    const whereClause: Prisma.TransactionWhereInput = { deletedAt: null, ...shopWhere(shopId) };
    // 1. Date Logic — F4: Fixed date mutation bug by NOT reusing the same `now` object
    if (dateFrom || dateTo) {
      whereClause.date = {
        ...(dateFrom && { gte: new Date(`${dateFrom}T00:00:00.000`) }),
        ...(dateTo && { lte: new Date(`${dateTo}T23:59:59.999`) }),
      };
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
    if (amountMin !== undefined || amountMax !== undefined) {
      whereClause.amount = {
        ...(amountMin !== undefined && { gte: amountMin }),
        ...(amountMax !== undefined && { lte: amountMax }),
      };
    }

    // 4. Type and PaymentMode Logic
    if (type && type !== "ALL") whereClause.type = type;
    if (paymentMode && paymentMode !== "ALL") whereClause.paymentMode = paymentMode;

    // P2: Offset-based pagination (cursor on non-unique sort leads to duplicates)
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: [
          { date: "desc" },
          { createdAt: "desc" }
        ],
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: { shop: { select: shopSummarySelect } },
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    return NextResponse.json({ items: transactions, total, page, pageSize: PAGE_SIZE }, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("timeout") || message.includes("connection")) {
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
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const parsed = await parseJsonBody(request, transactionCreateSchema);
    if (parsed.error) return parsed.error;
    const { amount: parsedAmount, type, date, category, paymentMode, description, status, productOrderId, bookingId, recordDate, shopId, ...restBody } = parsed.data;

    if (!(await canWriteTransaction(auth.user, { bookingId, productOrderId }))) {
      return forbiddenResponse();
    }

    const customData = pickCustomFields(restBody);
    const txDate = recordDate ?? date;
    // Entries without a shop (booking advances, gift payments, older clients) go to the default shop
    const resolvedShopId = await resolveShopForWrite(shopId);

    const transactionId = await generateNextTransactionId();

    const newTransaction = await prisma.transaction.create({
      data: {
        transactionId,
        amount: parsedAmount,
        type,
        date: txDate,
        category,
        paymentMode,
        description: description?.trim() || null,
        status: status || "SETTLED",
        ...(productOrderId ? { productOrder: { connect: { id: productOrderId } } } : {}),
        ...(bookingId ? { booking: { connect: { id: bookingId } } } : {}),
        customData: Object.keys(customData).length > 0 ? customData : undefined,
        user: { connect: { id: userId } },
        shop: { connect: { id: resolvedShopId } },
      },
      include: { shop: { select: shopSummarySelect } },
    });

    if (type === "INCOME") {
      // Fire and forget so we don't block the UI
      broadcastNotification({
        title: "Payment Received",
        message: `A payment of ₹${parsedAmount} was logged via ${paymentMode}.`,
        type: "PAYMENT_RECEIVED",
        actionUrl: `/transactions`,
        entityId: newTransaction.id,
        entityType: "transaction",
        skipUserId: userId
      }).catch(console.error);
    }

    return NextResponse.json(newTransaction, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to create transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, transactionReplaceSchema);
    if (parsed.error) return parsed.error;
    const { id, amount: parsedAmount, type, date, category, paymentMode, description, status, shopId, ...restBody } = parsed.data;

    const existing = await prisma.transaction.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (!(await canWriteTransaction(auth.user, existing))) {
      return forbiddenResponse();
    }

    const customData = { ...asJsonRecord(existing.customData), ...pickCustomFields(restBody) };
    // Moving an entry to another shop requires that shop to be active
    const nextShopId = shopId && shopId !== existing.shopId ? await resolveShopForWrite(shopId) : undefined;

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        amount: parsedAmount,
        type,
        date,
        category: category || existing.category,
        paymentMode: paymentMode || existing.paymentMode,
        description: description?.trim() || null,
        status: status || existing.status,
        customData: Object.keys(customData).length > 0 ? customData : undefined,
        ...(nextShopId ? { shopId: nextShopId } : {}),
      },
      include: { shop: { select: shopSummarySelect } },
    });

    return NextResponse.json(updated, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to update transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
