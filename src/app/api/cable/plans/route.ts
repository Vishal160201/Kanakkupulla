import { NextResponse } from "next/server";
import prisma, { toNumber } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { cableShopQuery } from "@/lib/validations/cable";

export const dynamic = "force-dynamic";

// GET /api/cable/plans?shopId= — plan names seen in the portal, their prices and how many subscribers use them.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, cableShopQuery);
  if (query.error) return query.error;
  try {
    const shop = await getCableShop(auth.user, query.data.shopId);
    const [plans, counts] = await Promise.all([
      prisma.cablePlan.findMany({ where: { shopId: shop.id }, orderBy: { name: "asc" } }),
      prisma.cableSubscriber.groupBy({ by: ["plan"], where: { shopId: shop.id, goneAt: null }, _count: { _all: true } }),
    ]);
    const countOf = new Map(counts.map((c) => [c.plan, c._count._all]));
    return NextResponse.json({
      plans: plans.map((p) => ({ id: p.id, name: p.name, price: p.price === null ? null : toNumber(p.price), subscribers: countOf.get(p.name) ?? 0 })),
    });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load plans");
  }
}
