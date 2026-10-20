import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess, requireOwner } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { productUpdateSchema } from "@/lib/validations/products";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("gifts", "VIEW");
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 200 },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("gifts", "MANAGE");
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const parsed = await parseJsonBody(request, productUpdateSchema);
    if (parsed.error) return parsed.error;
    const { name, description, price, stock } = parsed.data;

    const updated = await prisma.product.update({
      where: { id },
      data: { name, description: description?.trim(), price, stock },
    });

    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
