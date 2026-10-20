import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { customerBalances, getInventoryShop } from "@/lib/inventory";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { customerCreateSchema, customerListQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";

const customerSelect = { id: true, name: true, phone: true, place: true, isArchived: true, updatedAt: true } satisfies Prisma.InventoryCustomerSelect;

// GET /api/inventory/customers?shopId=&search= — customers with credit balance (highest first).
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, customerListQuery);
  if (query.error) return query.error;

  try {
    const { shopId, search } = query.data;
    await getInventoryShop(auth.user, shopId);

    const customers = await prisma.inventoryCustomer.findMany({
      where: {
        shopId,
        isArchived: false,
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }, { place: { contains: search, mode: "insensitive" } }] }
          : {}),
      },
      select: {
        ...customerSelect,
        bills: { where: { voidedAt: null }, orderBy: { date: "desc" }, take: 1, select: { date: true } },
        payments: { where: { voidedAt: null }, orderBy: { date: "desc" }, take: 1, select: { date: true } },
      },
      take: 500,
    });
    const balances = await customerBalances(prisma, shopId, customers.map(c => c.id));

    const items = customers
      .map(({ bills, payments, updatedAt, ...c }) => {
        const dates = [bills[0]?.date, payments[0]?.date].filter((d): d is Date => !!d);
        return {
          ...c,
          balance: balances.get(c.id) ?? 0,
          lastActivity: dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : updatedAt,
        };
      })
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));

    return NextResponse.json({ customers: items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load customers");
  }
}

// POST /api/inventory/customers
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, customerCreateSchema);
  if (body.error) return body.error;

  try {
    const { shopId, name, phone, place } = body.data;
    await getInventoryShop(auth.user, shopId, "MANAGE");
    const customer = await prisma.inventoryCustomer.create({
      data: { shopId, name, phone, place },
      select: { id: true, name: true, phone: true, place: true, isArchived: true },
    });
    return NextResponse.json({ customer: { ...customer, balance: 0, lastActivity: new Date() } }, { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to add customer");
  }
}
