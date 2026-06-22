import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const whereClause: any = {};

    if (startDateParam || endDateParam) {
      whereClause.date = {};
      if (startDateParam) whereClause.date.gte = new Date(startDateParam);
      if (endDateParam) whereClause.date.lte = new Date(endDateParam);
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Run parallel aggregates to get totals and breakdowns without transferring thousands of rows
    const [
      incomeAgg,
      expenseAgg,
      categoryExpenses,
      recentTransactions,
      todayTransactions,
      todayIncomeAgg,
      todayExpenseAgg
    ] = await Promise.all([
      // Total Income
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...whereClause, type: 'INCOME' }
      }),
      // Total Expenses
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...whereClause, type: 'EXPENSE' }
      }),
      // Expenses by Category
      prisma.transaction.groupBy({
        by: ['category'],
        _sum: { amount: true },
        where: { ...whereClause, type: 'EXPENSE' }
      }),
      // Recent transactions (limit 100 for any specific UI displays)
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
        where: { date: { gte: todayStart, lte: todayEnd } },
        orderBy: { date: 'desc' }
      }),
      // Today's Income
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'INCOME', date: { gte: todayStart, lte: todayEnd } }
      }),
      // Today's Expense
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'EXPENSE', date: { gte: todayStart, lte: todayEnd } }
      })
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpenses = expenseAgg._sum.amount || 0;
    
    const expensesByCategory = categoryExpenses.reduce((acc, curr) => {
      acc[curr.category] = curr._sum.amount || 0;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      expensesByCategory,
      recentTransactions,
      todayTransactions,
      todayIncome: todayIncomeAgg._sum.amount || 0,
      todayExpense: todayExpenseAgg._sum.amount || 0,
      todayNet: (todayIncomeAgg._sum.amount || 0) - (todayExpenseAgg._sum.amount || 0)
    });

  } catch (error) {
    console.error("Transactions Overview API Error:", error);
    return NextResponse.json({ error: "Failed to fetch transactions overview" }, { status: 500 });
  }
}
