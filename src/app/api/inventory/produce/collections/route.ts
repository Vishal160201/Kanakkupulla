import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getInventoryShop } from "@/lib/inventory";
import { collectionSelect, createCollection } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { produceCollectionCreateSchema, produceListQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

// GET /api/inventory/produce/collections?shopId=&page=&search=&itemId= — produce bought from farmers, newest first.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, produceListQuery);
  if (query.error) return query.error;

  try {
    const { shopId, page, search, itemId } = query.data;
    await getInventoryShop(auth.user, shopId);
    const where: Prisma.ProduceCollectionWhereInput = {
      shopId,
      ...(itemId ? { itemId } : {}),
      ...(search
        ? {
            OR: [
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { place: { contains: search, mode: "insensitive" } } },
              { item: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [collections, total] = await Promise.all([
      prisma.produceCollection.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        select: collectionSelect,
      }),
      prisma.produceCollection.count({ where }),
    ]);
    return NextResponse.json({ collections, total, page, pageSize: PAGE_SIZE }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load collections");
  }
}

// POST /api/inventory/produce/collections — produce bought from a farmer (owed to them until paid).
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, produceCollectionCreateSchema);
  if (body.error) return body.error;

  try {
    await getInventoryShop(auth.user, body.data.shopId, "MANAGE");
    const collection = await createCollection(auth.user, body.data);
    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to record collection");
  }
}
