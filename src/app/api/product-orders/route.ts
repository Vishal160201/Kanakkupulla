import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess } from "@/lib/authz";
import { generateOrderNumber } from "@/lib/orderId";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { productOrderCreateSchema, productOrderListQuerySchema } from "@/lib/validations/orders";

export async function GET(request: Request) {
  const auth = await requireAccess("gifts", "VIEW");
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, productOrderListQuerySchema);
  if (query.error) return query.error;
  const { limit, offset } = query.data;

  try {
    const productOrders = await prisma.productOrder.findMany({
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(productOrders, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch product orders:", error);
    return NextResponse.json({ error: "Failed to fetch product orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAccess("gifts", "MANAGE");
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, productOrderCreateSchema);
    if (parsed.error) return parsed.error;
    const { productId, quantity, status, clientName, clientPhone } = parsed.data;

    const orderNumber = await generateOrderNumber();

    const newProductOrder = await prisma.productOrder.create({
      data: {
        orderNumber,
        productId,
        quantity: typeof quantity === "number" ? quantity : 1,
        status: status || "PENDING",
        clientName,
        clientPhone,
      },
      include: {
        product: true,
      }
    });

    await prisma.systemLog.create({
      data: {
        action: "PRODUCT_ORDER_CREATED",
        details: `New Order Received - Order ID: ${newProductOrder.id} for product ${newProductOrder.product?.name || 'Multiple Items'}`,
        userId: auth.user.id,
      }
    });

    return NextResponse.json(newProductOrder, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to create product order:", error);
    return NextResponse.json({ error: "Failed to create product order" }, { status: 500 });
  }
}
