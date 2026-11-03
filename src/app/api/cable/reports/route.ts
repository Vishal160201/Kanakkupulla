import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { cableReport } from "@/lib/cable";
import { getCableShop } from "@/lib/cableSync";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { cableReportQuery } from "@/lib/validations/cable";

export const dynamic = "force-dynamic";

// GET /api/cable/reports?shopId=&provider= — last 6 months for one portal: renewals, billed, collected; by plan and area.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, cableReportQuery);
  if (query.error) return query.error;
  try {
    const shop = await getCableShop(auth.user, query.data.shopId);
    return NextResponse.json(await cableReport(shop.id, query.data.provider));
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load the report");
  }
}
