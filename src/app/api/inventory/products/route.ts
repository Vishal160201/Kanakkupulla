import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { InventoryValidationError, getInventoryShop, productPackSelect, stockByProduct } from "@/lib/inventory";
import { validatePack } from "@/lib/inventoryPacks";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { productCreateSchema, productListQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";

const productSelect = { ...productPackSelect, price: true, isArchived: true } as const;

// GET /api/inventory/products?shopId=&includeArchived=true — products with current stock.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, productListQuery);
  if (query.error) return query.error;

  try {
    const { shopId, includeArchived } = query.data;
    await getInventoryShop(auth.user, shopId);
    const [products, stock] = await Promise.all([
      prisma.inventoryProduct.findMany({
        where: { shopId, ...(includeArchived ? {} : { isArchived: false }) },
        orderBy: [{ isArchived: "asc" }, { name: "asc" }],
        select: productSelect,
      }),
      stockByProduct(prisma, shopId),
    ]);
    return NextResponse.json(
      { products: products.map(p => ({ ...p, stock: stock.get(p.id) ?? 0 })) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load products");
  }
}

// POST /api/inventory/products
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, productCreateSchema);
  if (body.error) return body.error;

  try {
    const { shopId, name, price } = body.data;
    await getInventoryShop(auth.user, shopId, "MANAGE");
    const pack = validatePack(body.data);
    if (!pack.ok) throw new InventoryValidationError(Object.values(pack.errors)[0], 422, pack.errors);
    const clash = await prisma.inventoryProduct.findFirst({
      where: { shopId, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) return NextResponse.json({ error: `"${name}" already exists in this shop.` }, { status: 409 });

    const product = await prisma.inventoryProduct.create({
      data: { shopId, name, ...pack.value, price },
      select: productSelect,
    });
    return NextResponse.json({ product: { ...product, stock: 0 } }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to create product");
  }
}
