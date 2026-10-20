import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { voidBill } from "@/lib/inventory";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/inventory/bills/[id]/void — reverse stock, remove its ledger entry and credit.
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const bill = await voidBill(auth.user, route.data.id);
    return NextResponse.json({ bill });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to void bill");
  }
}
