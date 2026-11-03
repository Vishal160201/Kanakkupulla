import { NextResponse } from "next/server";
import { z } from "zod";
import prisma, { toNumber } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { userNames } from "@/lib/cableUsers";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { dateInput, idSchema } from "@/lib/validations/common";

export const dynamic = "force-dynamic";

const query = z.object({ shopId: idSchema, date: dateInput("Pick a date.") });

// GET /api/cable/collections?shopId=&date=YYYY-MM-DD — that day's payments, with totals per collector.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const q = parseSearchParams(request, query);
  if (q.error) return q.error;
  try {
    const shop = await getCableShop(auth.user, q.data.shopId);
    const start = q.data.date;
    const end = new Date(start.getTime() + 86_400_000);
    const payments = await prisma.cablePayment.findMany({
      where: { shopId: shop.id, voidedAt: null, date: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      include: { subscriber: { select: { id: true, name: true, externalId: true, area: true } } },
    });
    const names = await userNames(payments.map((p) => p.createdById));
    const rows = payments.map((p) => ({
      id: p.id,
      amount: toNumber(p.amount),
      paymentMode: p.paymentMode,
      date: p.date,
      subscriber: p.subscriber,
      collectedBy: (p.createdById && names.get(p.createdById)) || "Unknown",
    }));
    const byCollector = new Map<string, number>();
    for (const r of rows) byCollector.set(r.collectedBy, (byCollector.get(r.collectedBy) ?? 0) + r.amount);
    return NextResponse.json({
      payments: rows,
      total: Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100,
      byCollector: [...byCollector].map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount),
    });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load collections");
  }
}
