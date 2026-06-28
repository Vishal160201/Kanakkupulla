import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();

    // 1. Fetch budgets for this month
    const budgets = await prisma.categoryBudget.findMany({
      where: {
        month: currentMonth,
        year: currentYear
      }
    });

    if (budgets.length === 0) {
      return NextResponse.json({ overview: [], alerts: [] });
    }

    // 2. Fetch sum of expenses for this month for the budgeted categories
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const categories = budgets.map(b => b.category);

    const expenses = await prisma.transaction.groupBy({
      by: ['category'],
      _sum: {
        amount: true
      },
      where: {
        type: "EXPENSE",
        category: { in: categories },
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        deletedAt: null
      }
    });

    const expenseMap = new Map();
    expenses.forEach(exp => {
      expenseMap.set(exp.category, exp._sum.amount || 0);
    });

    const overview = budgets.map(budget => {
      const spent = expenseMap.get(budget.category) || 0;
      const percentage = (spent / budget.monthlyLimit) * 100;
      let status = "good";
      if (percentage >= 100) status = "exceeded";
      else if (percentage >= 80) status = "warning";

      return {
        category: budget.category,
        limit: budget.monthlyLimit,
        spent: spent,
        remaining: budget.monthlyLimit - spent,
        percentage: Math.min(percentage, 100), // Cap at 100 for UI purposes usually
        status
      };
    });

    const alerts = overview.filter(o => o.status === "exceeded").map(o => {
       const overspentAmount = o.spent - o.limit;
       return {
         category: o.category,
         message: `⚠️ ${o.category} budget exceeded by ₹${overspentAmount.toLocaleString()}`
       }
    });

    return NextResponse.json({ overview, alerts });
  } catch (error: any) {
    console.error("Budget Overview Error:", error);
    return NextResponse.json({ error: "Failed to fetch budget overview" }, { status: 500 });
  }
}
