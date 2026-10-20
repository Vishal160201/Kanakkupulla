import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess } from "@/lib/authz";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { productCreateSchema, productListQuerySchema } from "@/lib/validations/products";

export async function GET(request: Request) {
  const auth = await requireAccess("gifts", "VIEW");
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, productListQuerySchema);
  if (query.error) return query.error;
  const { limit, offset } = query.data;

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: { id: true, name: true, description: true, price: true, stock: true, createdAt: true },
      }),
      prisma.product.count(),
    ]);

    return NextResponse.json({ items: products, total, limit, offset }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAccess("gifts", "MANAGE");
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, productCreateSchema);
    if (parsed.error) return parsed.error;
    const { name, description, price, stock } = parsed.data;

    const newProduct = await prisma.product.create({
      data: {
        name,
        description: description?.trim(),
        price,
        stock: typeof stock === "number" ? stock : 0,
      },
    });

    return NextResponse.json(newProduct, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
