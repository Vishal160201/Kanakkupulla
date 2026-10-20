import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { billInclude, customerBalances, formatBill, getInventoryShop } from "@/lib/inventory";
import { farmerProduceDues } from "@/lib/produce";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { customerUpdateSchema, inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/inventory/customers/[id] — customer, credit balance, sale bills and repayments.
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const customer = await prisma.inventoryCustomer.findUnique({
      where: { id: route.data.id },
      select: { id: true, shopId: true, name: true, phone: true, place: true, isArchived: true },
    });
    if (!customer) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    await getInventoryShop(auth.user, customer.shopId);

    const [bills, payments, balances] = await Promise.all([
      prisma.inventoryBill.findMany({
        where: { customerId: customer.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 200,
        include: billInclude,
      }),
      prisma.customerPayment.findMany({
        where: { customerId: customer.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 200,
        select: { id: true, amount: true, date: true, paymentMode: true, notes: true, voidedAt: true, producePayment: { select: { id: true } } },
      }),
      customerBalances(prisma, customer.shopId, [customer.id]),
    ]);

    const { shopId: _shopId, ...info } = customer; // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json(
      {
        customer: info,
        balance: balances.get(customer.id) ?? 0,
        bills: bills.map(b => { const { lines: _lines, ...row } = formatBill(b); return row; }), // eslint-disable-line @typescript-eslint/no-unused-vars
        // Credit deducted from a produce payment is voided with that payment, not on its own
        payments: payments.map(({ producePayment, ...p }) => ({ ...p, fromProducePayment: !!producePayment })),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load customer");
  }
}

// PUT /api/inventory/customers/[id]
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, customerUpdateSchema);
  if (body.error) return body.error;

  try {
    const existing = await prisma.inventoryCustomer.findUnique({ where: { id: route.data.id }, select: { id: true, shopId: true } });
    if (!existing) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    await getInventoryShop(auth.user, existing.shopId, "MANAGE");
    if (body.data.isArchived) {
      const balance = (await customerBalances(prisma, existing.shopId, [existing.id])).get(existing.id) ?? 0;
      if (balance > 0.005) {
        return NextResponse.json({ error: "This farmer still owes fertilizer credit. Settle it before archiving." }, { status: 409 });
      }
      const produceDue = (await farmerProduceDues(prisma, existing.shopId, [existing.id])).get(existing.id)?.due ?? 0;
      if (produceDue > 0.005) {
        return NextResponse.json({ error: "You still owe this farmer for produce. Pay them before archiving." }, { status: 409 });
      }
    }
    const customer = await prisma.inventoryCustomer.update({
      where: { id: existing.id },
      data: body.data,
      select: { id: true, name: true, phone: true, place: true, isArchived: true },
    });
    return NextResponse.json({ customer });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update customer");
  }
}
