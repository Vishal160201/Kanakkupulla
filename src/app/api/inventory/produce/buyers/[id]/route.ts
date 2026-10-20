import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getInventoryShop } from "@/lib/inventory";
import { buyerDues, formatProduceSale, produceSaleSelect, receiptSelect } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { inventoryIdParams, produceBuyerUpdateSchema } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/inventory/produce/buyers/[id] — a buyer's due, sales and receipts.
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const buyer = await prisma.produceBuyer.findUnique({
      where: { id: route.data.id },
      select: { id: true, shopId: true, name: true, phone: true, place: true, isArchived: true },
    });
    if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    await getInventoryShop(auth.user, buyer.shopId);

    const [sales, receipts, dues] = await Promise.all([
      prisma.produceSale.findMany({ where: { buyerId: buyer.id }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 200, select: produceSaleSelect }),
      prisma.produceReceipt.findMany({ where: { buyerId: buyer.id }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 200, select: receiptSelect }),
      buyerDues(prisma, buyer.shopId, [buyer.id]),
    ]);

    const { shopId: _shopId, ...info } = buyer; // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json(
      { buyer: info, due: dues.get(buyer.id) ?? 0, sales: sales.map(formatProduceSale), receipts },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load buyer");
  }
}

// PUT /api/inventory/produce/buyers/[id]
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, produceBuyerUpdateSchema);
  if (body.error) return body.error;

  try {
    const existing = await prisma.produceBuyer.findUnique({ where: { id: route.data.id }, select: { id: true, shopId: true } });
    if (!existing) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    await getInventoryShop(auth.user, existing.shopId, "MANAGE");
    if (body.data.isArchived) {
      const due = (await buyerDues(prisma, existing.shopId, [existing.id])).get(existing.id) ?? 0;
      if (due > 0.005) return NextResponse.json({ error: "This buyer still owes money. Collect the dues before archiving." }, { status: 409 });
    }
    const buyer = await prisma.produceBuyer.update({
      where: { id: existing.id },
      data: body.data,
      select: { id: true, name: true, phone: true, place: true, isArchived: true },
    });
    return NextResponse.json({ buyer });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update buyer");
  }
}
