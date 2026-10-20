import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { voidFarmerPayment } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/inventory/produce/payments/[id]/void — undo a farmer payment, its ledger entry and any deducted credit.
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const payment = await voidFarmerPayment(auth.user, route.data.id);
    return NextResponse.json({ payment });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to void payment");
  }
}
