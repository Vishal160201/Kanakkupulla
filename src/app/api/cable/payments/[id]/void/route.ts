import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { voidCablePayment } from "@/lib/cable";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { idParams } from "@/lib/validations/common";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/cable/payments/[id]/void — undo a collection (its Daily Kanakku entry goes too).
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, idParams);
  if (route.error) return route.error;
  try {
    return NextResponse.json(await voidCablePayment(auth.user, route.data.id));
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to void the payment");
  }
}
