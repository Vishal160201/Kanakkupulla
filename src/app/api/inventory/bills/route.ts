import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { billInclude, createBill, formatBill, getInventoryShop } from "@/lib/inventory";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { billCreateSchema, billListQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

// GET /api/inventory/bills?shopId=&kind=&page=&search= — newest first.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, billListQuery);
  if (query.error) return query.error;

  try {
    const { shopId, kind, page, search } = query.data;
    await getInventoryShop(auth.user, shopId);

    const where: Prisma.InventoryBillWhereInput = {
      shopId,
      ...(kind ? { kind } : {}),
      ...(search
        ? {
            OR: [
              { billNumber: { contains: search, mode: "insensitive" } },
              { supplierName: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [bills, total] = await Promise.all([
      prisma.inventoryBill.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: billInclude,
      }),
      prisma.inventoryBill.count({ where }),
    ]);

    return NextResponse.json(
      { bills: bills.map(b => { const { lines: _lines, ...row } = formatBill(b); return row; }), total, page, pageSize: PAGE_SIZE }, // eslint-disable-line @typescript-eslint/no-unused-vars
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load bills");
  }
}

// POST /api/inventory/bills — record a sale or purchase (posts to Daily Kanakku).
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, billCreateSchema);
  if (body.error) return body.error;

  try {
    await getInventoryShop(auth.user, body.data.shopId, "MANAGE");
    const bill = await createBill(auth.user, body.data);
    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to save bill");
  }
}
