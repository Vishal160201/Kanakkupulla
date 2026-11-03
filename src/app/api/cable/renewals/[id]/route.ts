import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { setRenewalAmount } from "@/lib/cable";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { idParams } from "@/lib/validations/common";
import { renewalAmountSchema } from "@/lib/validations/cable";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/cable/renewals/[id] — change what a renewal is charged (0 waives it).
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, idParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, renewalAmountSchema);
  if (body.error) return body.error;
  try {
    return NextResponse.json(await setRenewalAmount(auth.user, route.data.id, body.data.amount));
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update the renewal");
  }
}
