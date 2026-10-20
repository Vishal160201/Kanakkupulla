import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { productOrderUpdateSchema } from "@/lib/validations/orders";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const productOrder = await prisma.productOrder.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!productOrder) {
      return NextResponse.json({ error: "Product order not found" }, { status: 404 });
    }

    return NextResponse.json(productOrder, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch product order:", error);
    return NextResponse.json({ error: "Failed to fetch product order" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manage_bookings");
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const parsed = await parseJsonBody(request, productOrderUpdateSchema);
    if (parsed.error) return parsed.error;
    const { quantity, status, clientName, clientPhone } = parsed.data;

    const updated = await prisma.productOrder.update({
      where: { id },
      data: { quantity, status, clientName, clientPhone },
    });

    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to update product order:", error);
    return NextResponse.json({ error: "Failed to update product order" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manage_bookings");
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const existing = await prisma.productOrder.findUnique({ 
      where: { id },
      include: { transactions: true }
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Product orders have no deletedAt column: snapshot the order with its transactions, then remove both.
    await prisma.$transaction([
      prisma.recycleBin.create({
        data: {
          itemType: "product-order",
          itemId: id,
          originalData: JSON.parse(JSON.stringify(existing)),
          trashedById: auth.user.id,
        }
      }),
      prisma.transaction.deleteMany({ where: { productOrderId: id } }),
      prisma.productOrder.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to delete product order:", error);
    return NextResponse.json({ error: "Failed to delete product order" }, { status: 500 });
  }
}
