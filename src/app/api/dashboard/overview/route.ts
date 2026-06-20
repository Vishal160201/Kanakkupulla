import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const [
      totalBookings,
      upcomingShoots,
      pendingRetouch,
      activeOrders,
      totalActiveOrders,
      todayTransactions,
      todayIncomeAgg,
      todayExpenseAgg
    ] = await Promise.all([
      prisma.booking.count({
        where: { deletedAt: null }
      }),
      prisma.booking.findMany({
        where: { deletedAt: null, date: { gte: today } },
        include: { order: true, client: true },
        orderBy: { date: 'asc' },
        take: 3
      }),
      prisma.booking.count({
        where: { deletedAt: null, date: { lt: today, gte: twoWeeksAgo } }
      }),
      prisma.productOrder.findMany({
        where: { status: { not: 'DELIVERED' } },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }),
      prisma.productOrder.count({
        where: { status: { not: 'DELIVERED' } }
      }),
      prisma.transaction.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        orderBy: { date: 'desc' },
        take: 10
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'INCOME', date: { gte: todayStart, lte: todayEnd } }
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'EXPENSE', date: { gte: todayStart, lte: todayEnd } }
      })
    ]);

    return NextResponse.json({
      totalBookings,
      upcomingShoots,
      pendingRetouch,
      topOrder: activeOrders[0] || null,
      totalActiveOrders,
      todayTransactions,
      todayIncome: todayIncomeAgg._sum.amount || 0,
      todayExpense: todayExpenseAgg._sum.amount || 0,
      todayNet: (todayIncomeAgg._sum.amount || 0) - (todayExpenseAgg._sum.amount || 0)
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
