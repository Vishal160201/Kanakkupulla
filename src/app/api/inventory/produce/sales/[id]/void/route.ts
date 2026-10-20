import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { voidProduceSale } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/inventory/produce/sales/[id]/void — undo a sale (the produce goes back into stock).
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const sale = await voidProduceSale(auth.user, route.data.id);
    return NextResponse.json({ sale });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to void sale");
  }
}
