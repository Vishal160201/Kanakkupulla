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

    const userId = (session.user as any).id as string;

    const whereClause: any = { userId };

    if (startDateParam || endDateParam) {
      whereClause.date = {};
      if (startDateParam) whereClause.date.gte = new Date(startDateParam);
      if (endDateParam) whereClause.date.lte = new Date(endDateParam);
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
        where: { userId, date: { gte: todayStart, lte: todayEnd } },
        orderBy: { date: 'desc' }
      }),
      // Today's Income + Expense combined
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { userId, date: { gte: todayStart, lte: todayEnd } }
      }),
    ]);

    const incomeItem = typeAgg.find(t => t.type === 'INCOME');
    const expenseItem = typeAgg.find(t => t.type === 'EXPENSE');
    const totalIncome = incomeItem?._sum.amount || 0;
    const totalExpenses = expenseItem?._sum.amount || 0;
    
    const todayIncomeItem = todayTypeAgg.find(t => t.type === 'INCOME');
    const todayExpenseItem = todayTypeAgg.find(t => t.type === 'EXPENSE');
    const todayIncome = todayIncomeItem?._sum.amount || 0;
    const todayExpense = todayExpenseItem?._sum.amount || 0;

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
      todayIncome,
      todayExpense,
      todayNet: todayIncome - todayExpense
    });

  } catch (error) {
    console.error("Transactions Overview API Error:", error);
    return NextResponse.json({ error: "Failed to fetch transactions overview" }, { status: 500 });
  }
}
