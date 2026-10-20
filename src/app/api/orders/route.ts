import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess } from "@/lib/authz";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { orderCreateSchema, orderListQuerySchema } from "@/lib/validations/orders";

export async function GET(request: Request) {
  const auth = await requireAccess("bookings", "VIEW");
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, orderListQuerySchema);
  if (query.error) return query.error;
  const { limit, offset } = query.data;

  try {
    const orders = await prisma.order.findMany({
      include: {
        booking: {
          include: {
            client: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(orders, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAccess("bookings", "MANAGE");
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, orderCreateSchema);
    if (parsed.error) return parsed.error;
    const { bookingId, packageAmount, advanceAmount, dueAmount } = parsed.data;

    const newOrder = await prisma.order.create({
      data: {
        bookingId,
        package: packageAmount ?? 0,
        advance: advanceAmount ?? 0,
        due: dueAmount ?? 0,
      },
    });

    return NextResponse.json(newOrder, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
