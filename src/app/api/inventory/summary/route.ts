import { NextResponse } from "next/server";
import prisma, { toNumber } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { customerBalances, getInventoryShop, stockByProduct } from "@/lib/inventory";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { inventoryShopQuery } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";

// GET /api/inventory/summary?shopId= — stock value, stock status, today's bills, credit outstanding.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const query = parseSearchParams(request, inventoryShopQuery);
  if (query.error) return query.error;

  try {
    const { shopId } = query.data;
    await getInventoryShop(auth.user, shopId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [products, stock, todayTotals, balances] = await Promise.all([
      prisma.inventoryProduct.findMany({ where: { shopId, isArchived: false }, select: { id: true, price: true } }),
      stockByProduct(prisma, shopId),
      prisma.inventoryBill.groupBy({
        by: ["kind"],
        where: { shopId, voidedAt: null, date: { gte: todayStart, lt: todayEnd } },
        _sum: { totalAmount: true },
      }),
      customerBalances(prisma, shopId),
    ]);

    const stockValue = products.reduce((sum, p) => sum + Math.max(stock.get(p.id) ?? 0, 0) * p.price, 0);
    const dues = [...balances.values()].filter(v => v > 0.005);

    return NextResponse.json(
      {
        stockValue: Math.round(stockValue * 100) / 100,
        productCount: products.length,
        outOfStockCount: products.filter(p => (stock.get(p.id) ?? 0) <= 0).length,
        todaySales: toNumber(todayTotals.find(t => t.kind === "SALE")?._sum.totalAmount),
        todayPurchases: toNumber(todayTotals.find(t => t.kind === "PURCHASE")?._sum.totalAmount),
        creditOutstanding: Math.round(dues.reduce((a, b) => a + b, 0) * 100) / 100,
        customersWithDues: dues.length,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load inventory summary");
  }
}
