import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getInventoryShop } from "@/lib/inventory";
import { produceSummary } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { inventoryShopQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";

// GET /api/inventory/produce/summary?shopId= — stock per crop, owed to farmers, buyer dues, today's collection.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, inventoryShopQuery);
  if (query.error) return query.error;

  try {
    await getInventoryShop(auth.user, query.data.shopId);
    return NextResponse.json(await produceSummary(prisma, query.data.shopId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load produce summary");
  }
}
