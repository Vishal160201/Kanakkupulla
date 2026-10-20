import { NextResponse } from 'next/server';
import prisma, { toNumber } from '@/lib/prisma';
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/authz";
import { parseSearchParams } from "@/lib/validations/http";
import { transactionOverviewQuerySchema } from "@/lib/validations/transactions";

export async function GET(req: Request) {
  try {
    const auth = await requirePermission("view_transactions", "manage_transactions");
    if (auth.error) return auth.error;

    const query = parseSearchParams(req, transactionOverviewQuerySchema);
    if (query.error) return query.error;
    const { startDate, endDate } = query.data;

    const whereClause: Prisma.TransactionWhereInput = { deletedAt: null };

    if (startDate || endDate) {
      whereClause.date = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Run parallel aggregates — combined income+expense via groupBy
    const [
      typeAgg,
      categoryExpenses,
      recentTransactions,
      todayTransactions,
      todayTypeAgg,
    ] = await Promise.all([
      // Income + Expense totals in one query
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { ...whereClause }
      }),
      // Expenses by Category
      prisma.transaction.groupBy({
        by: ['category'],
        _sum: { amount: true },
        where: { ...whereClause, type: 'EXPENSE' }
      }),
      // Recent transactions (limit 100)
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 100
      }),
      // Today's Transactions
      prisma.transaction.findMany({
        where: { date: { gte: todayStart, lte: todayEnd }, deletedAt: null },
        orderBy: { date: 'desc' },
        take: 500
      }),
      // Today's Income + Expense combined
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { date: { gte: todayStart, lte: todayEnd }, deletedAt: null }
      }),
    ]);

    const incomeItem = typeAgg.find(t => t.type === 'INCOME');
    const expenseItem = typeAgg.find(t => t.type === 'EXPENSE');
    const totalIncome = toNumber(incomeItem?._sum.amount);
    const totalExpenses = toNumber(expenseItem?._sum.amount);
    
    const todayIncomeItem = todayTypeAgg.find(t => t.type === 'INCOME');
    const todayExpenseItem = todayTypeAgg.find(t => t.type === 'EXPENSE');
    const todayIncome = toNumber(todayIncomeItem?._sum.amount);
    const todayExpense = toNumber(todayExpenseItem?._sum.amount);

    const expensesByCategory = categoryExpenses.reduce((acc, curr) => {
      acc[curr.category] = toNumber(curr._sum.amount);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      expensesByCategory,
      recentTransactions,
      todayTransactions,
      todayIncome,
      todayExpense,
      todayNet: todayIncome - todayExpense
    });

  } catch (error) {
    console.error("Failed to fetch transactions overview:", error);
    return NextResponse.json({ error: "Failed to fetch transactions overview" }, { status: 500 });
  }
}
