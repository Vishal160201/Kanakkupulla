import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    const { productId, quantity, clientName, clientPhone, customData, createTransaction, amount, advanceAmount, dueAmount, paymentMode } = data;

    if (!productId || !clientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedCustomData = {
      ...(customData || {}),
      amount,
      advanceAmount,
      dueAmount
    };

    const order = await prisma.productOrder.create({
      data: {
        productId,
        quantity: quantity || 1,
        clientName,
        clientPhone,
        customData: updatedCustomData,
        status: "PENDING",
      }
    });

    const txAmount = advanceAmount !== undefined && advanceAmount !== "" ? parseFloat(advanceAmount) : parseFloat(amount);

    if (createTransaction && txAmount > 0) {
      await prisma.transaction.create({
        data: {
          productOrderId: order.id,
          amount: txAmount,
          type: "INCOME",
          date: new Date(),
          category: "GIFTS_AND_FRAMES",
          paymentMode: paymentMode || "Cash",
          status: "SETTLED",
          description: `Payment for Order ${order.id} - ${clientName}`
        }
      });
    }

    const createdOrder = await prisma.productOrder.findUnique({
      where: { id: order.id },
      include: { transactions: true, product: true }
    });

    return NextResponse.json({ order: createdOrder });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
