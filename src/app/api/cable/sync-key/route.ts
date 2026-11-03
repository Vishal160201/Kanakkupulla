import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop, hashSyncKey, newSyncKey } from "@/lib/cableSync";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody } from "@/lib/validations/http";
import { cableShopBody } from "@/lib/validations/cable";

// POST /api/cable/sync-key — makes a new sync key for the browser extension (the old one stops working).
// Only its hash is stored, so the key is returned this once.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, cableShopBody);
  if (body.error) return body.error;

  try {
    const shop = await getCableShop(auth.user, body.data.shopId, "MANAGE");
    const key = newSyncKey();
    await prisma.shop.update({ where: { id: shop.id }, data: { syncKeyHash: hashSyncKey(key) } });
    return NextResponse.json({ key });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to create a sync key");
  }
}
