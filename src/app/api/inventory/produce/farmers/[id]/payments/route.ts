import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { recordFarmerPayment } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { inventoryIdParams, produceFarmerPaymentSchema } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/inventory/produce/farmers/[id]/payments — pay a farmer for produce (cash posts to Daily
// Kanakku; any deducted fertilizer credit comes off their credit balance).
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, produceFarmerPaymentSchema);
  if (body.error) return body.error;

  try {
    const payment = await recordFarmerPayment(auth.user, route.data.id, body.data);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to record payment");
  }
}
