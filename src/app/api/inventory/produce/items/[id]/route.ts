import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { stockByItem, updateProduceItem } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { inventoryIdParams, produceItemUpdateSchema } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/inventory/produce/items/[id] — rename, change unit (before first use), archive / restore.
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, produceItemUpdateSchema);
  if (body.error) return body.error;

  try {
    const { shopId, ...item } = await updateProduceItem(auth.user, route.data.id, body.data);
    const stock = (await stockByItem(prisma, shopId, [item.id])).get(item.id) ?? 0;
    return NextResponse.json({ item: { ...item, stock } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update crop");
  }
}
