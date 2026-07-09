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

    const today = new Date();
    
    let startDate, endDate;
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    const [
      totalBookings,
      upcomingShoots,
      pendingRetouch,
      activeOrders,
      totalActiveOrders,
      unconfirmedBookingsCount
    ] = await Promise.all([
      prisma.booking.count({
        where: { deletedAt: null, status: { not: 'Cancelled' }, date: { gte: startOfDay, lte: endOfDay } }
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
      prisma.productOrder.count({
        where: { status: 'READY_FOR_PICKUP' }
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
      }),
      prisma.booking.count({
        where: { deletedAt: null, status: 'Pending', date: { gte: startOfDay, lte: endOfDay } }
      })
    ]);

    const [transactions, allPeriodTransactions, typeAgg, bookingsForChart] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay }, deletedAt: null },
        orderBy: { date: 'desc' },
        take: 10,
        select: { id: true, transactionId: true, amount: true, type: true, category: true, paymentMode: true, description: true, date: true },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay }, deletedAt: null },
        select: { amount: true, type: true, date: true }
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { date: { gte: startOfDay, lte: endOfDay }, deletedAt: null }
      }),
      prisma.booking.findMany({
        where: { deletedAt: null, date: { gte: startOfDay, lte: endOfDay } },
        select: { date: true, customData: true }
      })
    ]);

    const incomeItem = typeAgg.find(t => t.type === 'INCOME');
    const expenseItem = typeAgg.find(t => t.type === 'EXPENSE');
    const periodIncome = incomeItem?._sum.amount || 0;
    const periodExpense = expenseItem?._sum.amount || 0;

    const dailyDataMap: Record<string, { date: string, income: number, expense: number }> = {};
    let curr = new Date(startOfDay);
    while (curr <= endOfDay) {
      const dateStr = curr.toISOString().split('T')[0];
      dailyDataMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    allPeriodTransactions.forEach(tx => {
      const dateStr = tx.date.toISOString().split('T')[0];
      if (dailyDataMap[dateStr]) {
        if (tx.type === 'INCOME') dailyDataMap[dateStr].income += tx.amount;
        if (tx.type === 'EXPENSE') dailyDataMap[dateStr].expense += tx.amount;
      }
    });

    const revenueChartData = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

    const categoryCount: Record<string, number> = {};
    bookingsForChart.forEach(b => {
      let cat = 'Other';
      if (b.customData && typeof b.customData === 'object') {
        const cd = b.customData as any;
        cat = cd.eventType || cd.category || 'Other';
      }
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const bookingBreakdownData = Object.keys(categoryCount).map(key => ({
      name: key,
      value: categoryCount[key]
    }));

    const prefsDoc = await prisma.systemSetting.findUnique({
      where: { key: 'UI_PREFERENCES' }
    });
    const prefs = prefsDoc?.value as any || {};
    const hotDateBenchmark = prefs.hotDateBenchmark ?? prefs.hotDateThreshold ?? 50000;

    const upcomingAllBookings = await prisma.booking.findMany({
      where: { deletedAt: null, date: { gte: today } },
      select: { date: true, order: { select: { package: true } } }
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
      pendingRetouch,
      topOrder: activeOrders[0] || null,
      totalActiveOrders,
      transactions,
      periodIncome,
      periodExpense,
      periodNet: periodIncome - periodExpense,
      hotDatesCount,
      revenueChartData,
      bookingBreakdownData,
      unconfirmedBookingsCount
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
