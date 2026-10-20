import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { budgetDeleteQuerySchema, budgetListQuerySchema, budgetUpsertSchema } from "@/lib/validations/settings";

export async function GET(request: Request) {
  const auth = await requirePermission("view_transactions", "manage_transactions");
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, budgetListQuerySchema);
  if (query.error) return query.error;
  const { month, year } = query.data;

  try {
    const budgets = await prisma.categoryBudget.findMany({
      where: { month, year },
      orderBy: { category: 'asc' },
      take: 500
    });
    return NextResponse.json({ budgets });
  } catch (error) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("manage_transactions");
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, budgetUpsertSchema);
    if (parsed.error) return parsed.error;
    const { category, month, year, monthlyLimit } = parsed.data;
    const userId = auth.user.id;

    // Upsert budget for the category, month, year, userId
    const budget = await prisma.categoryBudget.upsert({
      where: {
        category_month_year_userId: { category, month, year, userId }
      },
      update: { monthlyLimit },
      create: { category, monthlyLimit, month, year, userId }
    });
    
    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Budget Error:", error);
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("manage_transactions");
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, budgetDeleteQuerySchema);
  if (query.error) return query.error;
  const { id } = query.data;

  try {
    await prisma.categoryBudget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete budget:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
