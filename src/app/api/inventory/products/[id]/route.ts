import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { InventoryValidationError, getInventoryShop, productPackSelect, stockByProduct } from "@/lib/inventory";
import { validatePack } from "@/lib/inventoryPacks";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { inventoryIdParams, productUpdateSchema } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/inventory/products/[id] — rename, change pack/price, archive/unarchive.
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, productUpdateSchema);
  if (body.error) return body.error;

  try {
    const existing = await prisma.inventoryProduct.findUnique({ where: { id: route.data.id } });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await getInventoryShop(auth.user, existing.shopId, "MANAGE");

    const { name, unit, packSize, packUnit, price, isArchived } = body.data;
    // Pack fields are checked together, filling in what the request leaves out from the product.
    const packChanged = unit !== undefined || packSize !== undefined || packUnit !== undefined;
    const pack = packChanged
      ? validatePack({ unit: unit ?? existing.unit, packSize: packSize !== undefined ? packSize : existing.packSize, packUnit: packUnit !== undefined ? packUnit : existing.packUnit })
      : null;
    if (pack && !pack.ok) throw new InventoryValidationError(Object.values(pack.errors)[0], 422, pack.errors);
    if (name) {
      const clash = await prisma.inventoryProduct.findFirst({
        where: { shopId: existing.shopId, name: { equals: name, mode: "insensitive" }, id: { not: existing.id } },
        select: { id: true },
      });
      if (clash) return NextResponse.json({ error: `"${name}" already exists in this shop.` }, { status: 409 });
    }

    const product = await prisma.inventoryProduct.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(pack?.ok ? pack.value : {}),
        ...(price !== undefined ? { price } : {}),
        ...(isArchived !== undefined ? { isArchived } : {}),
      },
      select: { ...productPackSelect, price: true, isArchived: true },
    });
    const stock = (await stockByProduct(prisma, existing.shopId, [existing.id])).get(existing.id) ?? 0;
    return NextResponse.json({ product: { ...product, stock } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update product");
  }
}
