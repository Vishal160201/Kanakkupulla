import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { setPlanPrice } from "@/lib/cable";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { idParams } from "@/lib/validations/common";
import { planPriceSchema } from "@/lib/validations/cable";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/cable/plans/[id] — set a plan's price (also prices its unpriced renewals).
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, idParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, planPriceSchema);
  if (body.error) return body.error;
  try {
    return NextResponse.json(await setPlanPrice(auth.user, route.data.id, body.data.price));
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update the plan");
  }
}
