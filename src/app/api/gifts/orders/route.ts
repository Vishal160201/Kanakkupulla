import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/orderId";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const productId = searchParams.get("productId");
    const paymentStatus = searchParams.get("paymentStatus");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const excludeStatus = searchParams.get("excludeStatus");
    
    // Pagination params
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const page = pageParam ? parseInt(pageParam, 10) : null;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 25;

    let whereClause: any = {};
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
      whereClause.createdAt = {};
      if (startDate) {
        // Parse DD/MM/YYYY
        const [d, m, y] = startDate.split("/");
        whereClause.createdAt.gte = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
      }
      if (endDate) {
        const [d, m, y] = endDate.split("/");
        whereClause.createdAt.lte = new Date(`${y}-${m}-${d}T23:59:59.999Z`);
      }
    }

    let orders = await prisma.productOrder.findMany({
      where: whereClause,
      include: {
        product: true,
        transactions: {
          where: { deletedAt: null }
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    // Memory-level filtering for Payment Status if provided
    if (paymentStatus) {
      const targetStatuses = paymentStatus.split(",").map(s => s.trim());
      orders = orders.filter((order: any) => {
        const totalAmount = parseFloat(order.customData?.amount || '0');
        const paidAmount = order.transactions
          .filter((t: any) => t.type === 'INCOME')
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        
        let pStatus = "UNPAID";
        if (paidAmount >= totalAmount && totalAmount > 0) pStatus = "PAID";
        else if (paidAmount > 0) pStatus = "PARTIAL";

        return targetStatuses.includes(pStatus);
      });
    }

    const totalCount = orders.length;

    // Apply pagination if requested
    if (page !== null && !isNaN(page)) {
      const startIndex = (page - 1) * pageSize;
      orders = orders.slice(startIndex, startIndex + pageSize);
    }

    return NextResponse.json({ orders, totalCount });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { productId, quantity, clientName, clientPhone, dueDate, customData, createTransaction, amount, advanceAmount, dueAmount, paymentMode } = data;

    if (!productId || !clientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedCustomData = {
      ...(customData || {}),
      amount,
      advanceAmount,
      dueAmount,
      paymentMode
    };

    const orderNumber = await generateOrderNumber();

    const order = await prisma.productOrder.create({
      data: {
        orderNumber,
        productId,
        quantity: quantity || 1,
        clientName,
        clientPhone,
        dueDate: dueDate ? new Date(dueDate) : null,
        customData: updatedCustomData,
        status: "PENDING",
      }
    });

    const createdOrder = await prisma.productOrder.findUnique({
      where: { id: order.id },
      include: { transactions: true, product: true }
    });

    const txAmount = advanceAmount !== undefined && advanceAmount !== "" ? parseFloat(advanceAmount) : parseFloat(amount);
    const shouldCreateTx = createTransaction !== undefined ? createTransaction : (txAmount > 0);

    if (shouldCreateTx && txAmount > 0) {
      await prisma.transaction.create({
        data: {
          productOrder: { connect: { id: order.id } },
          amount: txAmount,
          type: "INCOME",
          date: new Date(),
          category: "GIFTS_AND_FRAMES",
          paymentMode: paymentMode || "Cash",
          description: `Advance Payment for Order ${orderNumber || `#MDorder-${order.id.slice(-6).toUpperCase()}`} - ${clientName} (${createdOrder?.product?.name || 'Unknown Product'})`
        }
      });
      
      // Refetch if transaction was created
      const finalOrder = await prisma.productOrder.findUnique({
        where: { id: order.id },
        include: { transactions: true, product: true }
      });
      return NextResponse.json({ order: finalOrder });
    }

    return NextResponse.json({ order: createdOrder });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
