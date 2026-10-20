import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { recordPayment } from "@/lib/inventory";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { inventoryIdParams, paymentCreateSchema } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/inventory/customers/[id]/payments — credit repayment (posts to Daily Kanakku).
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, paymentCreateSchema);
  if (body.error) return body.error;

  try {
    const payment = await recordPayment(auth.user, route.data.id, body.data);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to record payment");
  }
}
