import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { customerBalances, getInventoryShop } from "@/lib/inventory";
import { farmerProduceDues } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { produceFarmerListQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";

// GET /api/inventory/produce/farmers?shopId=&search= — farmers (credit customers) with what we owe
// them for produce (all crops) and the fertilizer credit they owe us; most owed first.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, produceFarmerListQuery);
  if (query.error) return query.error;

  try {
    const { shopId, search } = query.data;
    await getInventoryShop(auth.user, shopId);

    const farmers = await prisma.inventoryCustomer.findMany({
      where: {
        shopId,
        isArchived: false,
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }, { place: { contains: search, mode: "insensitive" } }] }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        place: true,
        produceCollections: { where: { voidedAt: null }, orderBy: { date: "desc" }, take: 1, select: { date: true } },
      },
      take: 500,
    });
    const ids = farmers.map(f => f.id);
    const [dues, credit, crops] = await Promise.all([
      farmerProduceDues(prisma, shopId, ids),
      customerBalances(prisma, shopId, ids),
      prisma.produceCollection.findMany({
        where: { shopId, voidedAt: null, customerId: { in: ids } },
        distinct: ["customerId", "itemId"],
        select: { customerId: true, item: { select: { name: true } } },
      }),
    ]);
    const cropsBy = new Map<string, string[]>();
    for (const c of crops) cropsBy.set(c.customerId, [...(cropsBy.get(c.customerId) ?? []), c.item.name]);

    const items = farmers
      .map(({ produceCollections, ...f }) => ({
        ...f,
        produceDue: dues.get(f.id)?.due ?? 0,
        collectedAmount: dues.get(f.id)?.collectedAmount ?? 0,
        collections: dues.get(f.id)?.collections ?? 0,
        crops: (cropsBy.get(f.id) ?? []).sort(),
        fertilizerCredit: credit.get(f.id) ?? 0,
        lastCollection: produceCollections[0]?.date ?? null,
      }))
      .sort((a, b) => b.produceDue - a.produceDue || b.collectedAmount - a.collectedAmount || a.name.localeCompare(b.name));

    return NextResponse.json({ farmers: items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load farmers");
  }
}
