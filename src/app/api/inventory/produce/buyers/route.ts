import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getInventoryShop } from "@/lib/inventory";
import { buyerDues } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { produceBuyerCreateSchema, produceBuyerListQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";

// GET /api/inventory/produce/buyers?shopId=&search= — produce buyers (marketers / traders) with their dues, highest first.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, produceBuyerListQuery);
  if (query.error) return query.error;

  try {
    const { shopId, search } = query.data;
    await getInventoryShop(auth.user, shopId);

    const buyers = await prisma.produceBuyer.findMany({
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
        sales: { where: { voidedAt: null }, orderBy: { date: "desc" }, take: 1, select: { date: true } },
      },
      take: 500,
    });
    const dues = await buyerDues(prisma, shopId, buyers.map(b => b.id));
    const items = buyers
      .map(({ sales, ...b }) => ({ ...b, due: dues.get(b.id) ?? 0, lastSale: sales[0]?.date ?? null }))
      .sort((a, b) => b.due - a.due || a.name.localeCompare(b.name));

    return NextResponse.json({ buyers: items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load buyers");
  }
}

// POST /api/inventory/produce/buyers
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, produceBuyerCreateSchema);
  if (body.error) return body.error;

  try {
    const { shopId, name, phone, place } = body.data;
    await getInventoryShop(auth.user, shopId, "MANAGE");
    const buyer = await prisma.produceBuyer.create({
      data: { shopId, name, phone, place },
      select: { id: true, name: true, phone: true, place: true },
    });
    return NextResponse.json({ buyer: { ...buyer, due: 0, lastSale: null } }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to add buyer");
  }
}
