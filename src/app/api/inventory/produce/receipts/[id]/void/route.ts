import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { voidBuyerReceipt } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/inventory/produce/receipts/[id]/void — undo a buyer receipt and its ledger entry.
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const receipt = await voidBuyerReceipt(auth.user, route.data.id);
    return NextResponse.json({ receipt });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to void receipt");
  }
}
