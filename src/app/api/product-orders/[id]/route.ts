import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    console.error("Error fetching product order:", error);
    return NextResponse.json({ error: "Failed to fetch product order" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;
    const body = await request.json();
    const { quantity, status, clientName, clientPhone } = body;

    const updated = await prisma.productOrder.update({
      where: { id },
      data: {
        quantity: quantity !== undefined ? parseInt(quantity, 10) : undefined,
        status,
        clientName: clientName?.trim(),
        clientPhone: clientPhone?.trim(),
      },
    });

    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error updating product order:", error);
    return NextResponse.json({ error: "Failed to update product order" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;
    const existing = await prisma.productOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.recycleBin.create({
      data: {
        itemType: "product-order",
        itemId: id,
        originalData: existing as any,
        trashedById: (session.user as any).id,
      }
    });

    await prisma.productOrder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error deleting product order:", error);
    return NextResponse.json({ error: "Failed to delete product order" }, { status: 500 });
  }
}
