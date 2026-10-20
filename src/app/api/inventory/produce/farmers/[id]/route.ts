import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { customerBalances, getInventoryShop } from "@/lib/inventory";
import { collectionSelect, farmerCropBreakdown, farmerPaymentSelect, farmerProduceDues } from "@/lib/produce";
import { maxCreditDeduction } from "@/lib/produceMath";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/inventory/produce/farmers/[id] — a farmer's produce: what we owe (all crops), per-crop
// breakdown, their fertilizer credit, collections and payments.
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const farmer = await prisma.inventoryCustomer.findUnique({
      where: { id: route.data.id },
      select: { id: true, shopId: true, name: true, phone: true, place: true, isArchived: true },
    });
    if (!farmer) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    await getInventoryShop(auth.user, farmer.shopId);

    const [collections, payments, dues, credit, crops] = await Promise.all([
      prisma.produceCollection.findMany({
        where: { customerId: farmer.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 200,
        select: collectionSelect,
      }),
      prisma.producePayment.findMany({
        where: { customerId: farmer.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 200,
        select: farmerPaymentSelect,
      }),
      farmerProduceDues(prisma, farmer.shopId, [farmer.id]),
      customerBalances(prisma, farmer.shopId, [farmer.id]),
      farmerCropBreakdown(prisma, farmer.id),
    ]);

    const { shopId: _shopId, ...info } = farmer; // eslint-disable-line @typescript-eslint/no-unused-vars
    const produceDue = dues.get(farmer.id)?.due ?? 0;
    const fertilizerCredit = credit.get(farmer.id) ?? 0;
    return NextResponse.json(
      {
        farmer: info,
        produceDue,
        collectedAmount: dues.get(farmer.id)?.collectedAmount ?? 0,
        crops,
        fertilizerCredit,
        maxCreditDeduction: maxCreditDeduction(produceDue, fertilizerCredit),
        collections,
        payments,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load farmer");
  }
}
