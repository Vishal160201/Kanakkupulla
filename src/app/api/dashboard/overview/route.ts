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
    const userId = (session.user as any).id as string;

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
      totalActiveOrders
    ] = await Promise.all([
      prisma.booking.count({
        where: { deletedAt: null }
      }),
      prisma.booking.findMany({
        where: { deletedAt: null, date: { gte: today } },
        select: {
          id: true,
          date: true,
          time: true,
          location: true,
          status: true,
          customData: true,
          client: { select: { name: true, phone: true } },
          order: { select: { package: true } },
        },
        orderBy: { date: 'asc' },
        take: 3
      }),
      prisma.booking.count({
        where: { deletedAt: null, date: { lt: today, gte: twoWeeksAgo } }
      }),
      prisma.productOrder.findMany({
        where: { status: { not: 'DELIVERED' } },
        select: {
          id: true,
          quantity: true,
          status: true,
          clientName: true,
          product: { select: { name: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      }),
      prisma.productOrder.count({
        where: { status: { not: 'DELIVERED' } }
      })
    ]);

    // Debugging Transaction Counts
    const allTodayTxCount = await prisma.transaction.count({
      where: { date: { gte: todayStart, lte: todayEnd } }
    });
    const filteredTodayTxCount = await prisma.transaction.count({
      where: { date: { gte: todayStart, lte: todayEnd }, deletedAt: null }
    });
    console.log('transaction count before filter:', allTodayTxCount, 'after deletedAt filter:', filteredTodayTxCount);

    const [todayTransactions, todayTypeAgg] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: todayStart, lte: todayEnd }, deletedAt: null },
        orderBy: { date: 'desc' },
        take: 10,
        select: { id: true, transactionId: true, amount: true, type: true, category: true, paymentMode: true, description: true, date: true },
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { date: { gte: todayStart, lte: todayEnd }, deletedAt: null }
      })
    ]);

    const todayIncomeItem = todayTypeAgg.find(t => t.type === 'INCOME');
    const todayExpenseItem = todayTypeAgg.find(t => t.type === 'EXPENSE');
    const todayIncome = todayIncomeItem?._sum.amount || 0;
    const todayExpense = todayExpenseItem?._sum.amount || 0;

    // Calculate Hot Dates
    const prefsDoc = await prisma.systemSetting.findUnique({
      where: { key: 'UI_PREFERENCES' }
    });
    const prefs = prefsDoc?.value as any || {};
    const hotDateBenchmark = prefs.hotDateBenchmark ?? prefs.hotDateThreshold ?? 50000;

    const upcomingAllBookings = await prisma.booking.findMany({
      where: { deletedAt: null, date: { gte: todayStart } },
      select: {
        date: true,
        order: { select: { package: true } }
      }
    });

    const dateSums: Record<string, number> = {};
    for (const b of upcomingAllBookings) {
      if (!b.date) continue;
      const dateStr = b.date.toISOString().split('T')[0];
      dateSums[dateStr] = (dateSums[dateStr] || 0) + (b.order?.package || 0);
    }
    const hotDatesCount = Object.values(dateSums).filter(sum => sum >= hotDateBenchmark).length;

    return NextResponse.json({
      totalBookings,
      upcomingShoots,
      pendingRetouch: pendingRetouch,
      topOrder: activeOrders[0] || null,
      totalActiveOrders,
      todayTransactions,
      todayIncome,
      todayExpense,
      todayNet: todayIncome - todayExpense,
      hotDatesCount
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
