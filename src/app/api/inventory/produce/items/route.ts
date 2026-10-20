import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { InventoryValidationError, getInventoryShop } from "@/lib/inventory";
import { listProduceItems, produceItemSelect } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { produceItemCreateSchema, produceItemListQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";

// GET /api/inventory/produce/items?shopId=&includeArchived=true — the shop's crop list with stock.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, produceItemListQuery);
  if (query.error) return query.error;

  try {
    const { shopId, includeArchived } = query.data;
    await getInventoryShop(auth.user, shopId);
    return NextResponse.json({ items: await listProduceItems(prisma, shopId, includeArchived) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load crops");
  }
}

// POST /api/inventory/produce/items — add a crop to the shop's list.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, produceItemCreateSchema);
  if (body.error) return body.error;

  try {
    const { shopId, name, unit } = body.data;
    await getInventoryShop(auth.user, shopId, "MANAGE");
    const clash = await prisma.produceItem.findFirst({ where: { shopId, name: { equals: name, mode: "insensitive" } }, select: { id: true, isArchived: true } });
    if (clash) {
      const message = clash.isArchived ? `"${name}" is archived. Restore it from the crop list.` : `"${name}" is already in your crop list.`;
      throw new InventoryValidationError(message, 409, { name: message });
    }
    const item = await prisma.produceItem.create({ data: { shopId, name, unit }, select: produceItemSelect });
    return NextResponse.json({ item: { ...item, stock: 0 } }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to add crop");
  }
}
