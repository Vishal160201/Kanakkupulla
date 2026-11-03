import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { cableReport } from "@/lib/cable";
import { getCableShop } from "@/lib/cableSync";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { cableShopQuery } from "@/lib/validations/cable";

export const dynamic = "force-dynamic";

// GET /api/cable/reports?shopId= — last 6 months: renewals, billed, collected, wallet top-ups, margin; by plan and area.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, cableShopQuery);
  if (query.error) return query.error;
  try {
    const shop = await getCableShop(auth.user, query.data.shopId);
    return NextResponse.json(await cableReport(shop.id));
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load the report");
  }
}
