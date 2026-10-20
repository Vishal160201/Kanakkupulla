import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { billInclude, formatBill, getInventoryShop } from "@/lib/inventory";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { inventoryIdParams } from "@/lib/validations/inventory";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/inventory/bills/[id] — bill with its lines.
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, inventoryIdParams);
  if (route.error) return route.error;

  try {
    const bill = await prisma.inventoryBill.findUnique({ where: { id: route.data.id }, include: billInclude });
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    await getInventoryShop(auth.user, bill.shopId);
    return NextResponse.json({ bill: formatBill(bill) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load bill");
  }
}
