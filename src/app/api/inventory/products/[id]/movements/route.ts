import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getInventoryShop } from "@/lib/inventory";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/inventory/products/[id]/movements — stock history (newest first) with running balance.
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const product = await prisma.inventoryProduct.findUnique({
      where: { id: route.data.id },
      select: { id: true, shopId: true, name: true, unit: true, packSize: true, packUnit: true, price: true, isArchived: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await getInventoryShop(auth.user, product.shopId);

    const movements = await prisma.stockMovement.findMany({
      where: { productId: product.id, voidedAt: null },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      take: 2000,
      select: {
        id: true, type: true, quantity: true, unitPrice: true, amount: true, date: true, notes: true,
        bill: { select: { id: true, billNumber: true, kind: true } },
      },
    });

    let balance = 0;
    const withBalance = movements.map(m => {
      balance = Math.round((balance + m.quantity) * 1000) / 1000;
      return { ...m, balanceAfter: balance };
    });

    const { shopId: _shopId, ...productInfo } = product; // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json(
      { product: { ...productInfo, stock: balance }, movements: withBalance.reverse() },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load stock history");
  }
}
