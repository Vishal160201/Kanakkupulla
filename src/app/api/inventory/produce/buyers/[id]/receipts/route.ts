import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { recordBuyerReceipt } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { inventoryIdParams, paymentCreateSchema } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/inventory/produce/buyers/[id]/receipts — money received against a buyer's dues.
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, paymentCreateSchema);
  if (body.error) return body.error;

  try {
    const receipt = await recordBuyerReceipt(auth.user, route.data.id, body.data);
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to record receipt");
  }
}
