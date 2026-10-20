import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { createAdjustment, getInventoryShop } from "@/lib/inventory";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody } from "@/lib/validations/http";
import { adjustmentSchema } from "@/lib/validations/inventory";

// POST /api/inventory/adjustments — manual stock correction (signed quantity).
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, adjustmentSchema);
  if (body.error) return body.error;

  try {
    await getInventoryShop(auth.user, body.data.shopId, "MANAGE");
    const movement = await createAdjustment(auth.user, body.data);
    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to adjust stock");
  }
}
