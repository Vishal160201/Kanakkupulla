import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getInventoryShop } from "@/lib/inventory";
import { createProduceSale, formatProduceSale, produceSaleSelect } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { produceListQuery, produceSaleCreateSchema } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

// GET /api/inventory/produce/sales?shopId=&page=&search=&itemId= — produce sold to buyers, newest first.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, produceListQuery);
  if (query.error) return query.error;

  try {
    const { shopId, page, search, itemId } = query.data;
    await getInventoryShop(auth.user, shopId);
    const where: Prisma.ProduceSaleWhereInput = {
      shopId,
      ...(itemId ? { itemId } : {}),
      ...(search
        ? {
            OR: [
              { saleNumber: { contains: search, mode: "insensitive" } },
              { buyer: { name: { contains: search, mode: "insensitive" } } },
              { item: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [sales, total] = await Promise.all([
      prisma.produceSale.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        select: produceSaleSelect,
      }),
      prisma.produceSale.count({ where }),
    ]);
    return NextResponse.json({ sales: sales.map(formatProduceSale), total, page, pageSize: PAGE_SIZE }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load produce sales");
  }
}

// POST /api/inventory/produce/sales — sell produce to a buyer (paid part posts to Daily Kanakku).
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, produceSaleCreateSchema);
  if (body.error) return body.error;

  try {
    await getInventoryShop(auth.user, body.data.shopId, "MANAGE");
    const sale = await createProduceSale(auth.user, body.data);
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to record sale");
  }
}
