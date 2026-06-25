import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/orderId";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const orders = await prisma.productOrder.findMany({
      where: status ? { status } : undefined,
      include: {
        product: true,
        transactions: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ orders });
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
          status: "SETTLED",
          description: `Advance Payment for Order ${order.id} - ${clientName}`
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
