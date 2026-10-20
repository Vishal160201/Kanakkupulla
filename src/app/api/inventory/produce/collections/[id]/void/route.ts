import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { voidCollection } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/inventory/produce/collections/[id]/void — undo a collection.
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const collection = await voidCollection(auth.user, route.data.id);
    return NextResponse.json({ collection });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to void collection");
  }
}
