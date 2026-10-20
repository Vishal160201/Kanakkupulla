import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/orderId";
import { broadcastNotification } from "@/lib/notifications";
import { getDefaultShopId } from "@/lib/shops";
import { requirePermission, requireUser } from "@/lib/authz";
import type { Prisma } from "@prisma/client";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { asJsonRecord } from "@/lib/validations/common";
import { giftOrderCreateSchema, giftOrderListQuerySchema } from "@/lib/validations/gifts";

const dmyToUtc = (value: string, time: string) => {
  const [d, m, y] = value.split("/");
  return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${time}Z`);
};

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, giftOrderListQuerySchema);
  if (query.error) return query.error;
  const { status, productId, paymentStatus, startDate, endDate, excludeStatus, page, pageSize } = query.data;

  try {
    const paginateInDb = page !== null && !paymentStatus;

    const whereClause: Prisma.ProductOrderWhereInput = {};
    if (status) {
      if (status.includes(",")) {
        whereClause.status = { in: status.split(",").map(s => s.trim()) };
      } else {
        whereClause.status = status;
      }
    } else if (excludeStatus) {
      whereClause.status = { not: excludeStatus };
    }
    
    if (productId) whereClause.productId = productId;
    
    if (startDate || endDate) {
      // Dates arrive as DD/MM/YYYY
      whereClause.createdAt = {
        ...(startDate && { gte: dmyToUtc(startDate, "00:00:00.000") }),
        ...(endDate && { lte: dmyToUtc(endDate, "23:59:59.999") }),
      };
    }

    // Payment status is derived from transactions, so that filter still has to run in memory
    let orders = await prisma.productOrder.findMany({
      where: whereClause,
      include: {
        product: true,
        transactions: {
          where: { deletedAt: null }
        },
      },
      orderBy: { createdAt: 'desc' },
      // Without DB pagination (payment-status filter / no page) still cap the scan
      ...(paginateInDb ? { skip: (page - 1) * pageSize, take: pageSize } : { take: 2000 }),
    });

    // Memory-level filtering for Payment Status if provided
    if (paymentStatus) {
      const targetStatuses = paymentStatus.split(",").map(s => s.trim());
      orders = orders.filter((order) => {
        const totalAmount = parseFloat(String(asJsonRecord(order.customData).amount || '0'));
        const paidAmount = order.transactions
          .filter((t) => t.type === 'INCOME')
          .reduce((sum, t) => sum + t.amount, 0);
        
        let pStatus = "UNPAID";
        if (paidAmount >= totalAmount && totalAmount > 0) pStatus = "PAID";
        else if (paidAmount > 0) pStatus = "PARTIAL";

        return targetStatuses.includes(pStatus);
      });
    }

    const totalCount = paginateInDb ? await prisma.productOrder.count({ where: whereClause }) : orders.length;

    // Apply pagination if requested
    if (!paginateInDb && page !== null) {
      const startIndex = (page - 1) * pageSize;
      orders = orders.slice(startIndex, startIndex + pageSize);
    }

    return NextResponse.json({ orders, totalCount });
  } catch (error) {
    console.error("Failed to fetch gift orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("manage_bookings");
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, giftOrderCreateSchema);
    if (parsed.error) return parsed.error;
    const { productId, quantity, clientName, clientPhone, dueDate, customData, createTransaction, amount, advanceAmount, dueAmount, paymentMode, recordDate, advanceDate } = parsed.data;

    const parsedQuantity = typeof quantity === "number" ? quantity : 1;

    const updatedCustomData: Prisma.InputJsonObject = {
      ...(customData ?? {}),
      amount,
      advanceAmount,
      dueAmount,
      paymentMode
    };

    const orderNumber = await generateOrderNumber();
    const txAmount = advanceAmount !== undefined && advanceAmount !== null && advanceAmount !== ""
      ? parseFloat(String(advanceAmount))
      : parseFloat(String(amount));
    const shouldCreateTx = createTransaction !== undefined ? createTransaction : (txAmount > 0);

    const order = await prisma.$transaction(async tx => {
      const order = await tx.productOrder.create({
        data: {
          orderNumber,
          productId,
          quantity: parsedQuantity,
          clientName,
          clientPhone: clientPhone || null,
          dueDate: dueDate ?? null,
          customData: updatedCustomData,
          status: "PENDING",
          ...(recordDate ? { createdAt: recordDate } : {}),
        },
        include: { product: true }
      });

      if (shouldCreateTx && txAmount > 0) {
        await tx.transaction.create({
          data: {
            productOrder: { connect: { id: order.id } },
            user: { connect: { id: auth.user.id } },
            // Automatic gift payments go to the default shop
            shop: { connect: { id: await getDefaultShopId(tx) } },
            amount: txAmount,
            type: "INCOME",
            date: advanceDate ?? recordDate ?? new Date(),
            category: "GIFTS_AND_FRAMES",
            paymentMode: paymentMode || "Cash",
            description: `Advance Payment for Order ${orderNumber || `#MDorder-${order.id.slice(-6).toUpperCase()}`} - ${clientName} (${order.product?.name || 'Unknown Product'})`,
            ...(advanceDate || recordDate ? { createdAt: advanceDate ?? recordDate } : {}),
          }
        });
      }

      return order;
    });

    const createdOrder = await prisma.productOrder.findUnique({
      where: { id: order.id },
      include: { transactions: true, product: true }
    });

    // Notify about new order
    broadcastNotification({
      title: "New Product Order",
      message: `Order ${orderNumber || `#MDorder-${order.id.slice(-6).toUpperCase()}`} received for ${clientName}.`,
      type: "ORDER_CREATED",
      actionUrl: `/gifts`,
      entityId: order.id,
      entityType: "order",
      skipUserId: auth.user.id
    }).catch(console.error);

    return NextResponse.json({ order: createdOrder });
  } catch (error) {
    console.error("Failed to create product order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
