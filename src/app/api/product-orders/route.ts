import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/orderId";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const productOrders = await prisma.productOrder.findMany({
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(productOrders, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch product orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, quantity, status, clientName, clientPhone } = body;

    if (!productId || !clientName) {
      return NextResponse.json({ error: "Product ID and client name are required" }, { status: 422 });
    }

    const orderNumber = await generateOrderNumber();

    const newProductOrder = await prisma.productOrder.create({
      data: {
        orderNumber,
        productId,
        quantity: parseInt(quantity || "1", 10),
        status: status || "PENDING",
        clientName: clientName.trim(),
        clientPhone: clientPhone?.trim(),
      },
      include: {
        product: true,
      }
    });

    await prisma.systemLog.create({
      data: {
        action: "PRODUCT_ORDER_CREATED",
        details: `New Order Received - Order ID: ${newProductOrder.id} for product ${newProductOrder.product?.name || 'Multiple Items'}`,
        userId: (session.user as any).id,
      }
    });

    return NextResponse.json(newProductOrder, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product order" }, { status: 500 });
  }
}
