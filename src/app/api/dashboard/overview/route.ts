import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma, { toNumber } from '@/lib/prisma';
import { requireUser } from "@/lib/authz";
import { parseSearchParams } from "@/lib/validations/http";
import { asJsonRecord } from "@/lib/validations/common";
import { dashboardOverviewQuerySchema } from "@/lib/validations/dashboard";

type PendingAlbum = { id: string; clientName: string; status: string; date: Date };

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const query = parseSearchParams(req, dashboardOverviewQuerySchema);
    if (query.error) return query.error;
    const { startDate: startDateParam, endDate: endDateParam } = query.data;

    const today = new Date();

    let startDate: Date, endDate: Date;
    if (startDateParam && endDateParam) {
      startDate = startDateParam;
      endDate = endDateParam;
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

    const [transactions, dailyTotals, typeAgg, bookingsForChart] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay }, deletedAt: null },
        orderBy: { date: 'desc' },
        take: 10,
        select: { id: true, transactionId: true, amount: true, type: true, category: true, paymentMode: true, description: true, date: true },
      }),
      // Per-day income/expense totals (UTC day, matching toISOString below), aggregated in SQL
      prisma.$queryRaw<{ day: string; type: string; total: Prisma.Decimal | null }[]>`
        SELECT to_char("date", 'YYYY-MM-DD') AS day, "type", SUM("amount") AS total
        FROM "Transaction"
        WHERE "date" >= ${startOfDay} AND "date" <= ${endOfDay} AND "deletedAt" IS NULL
        GROUP BY 1, 2
      `,
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { date: { gte: startOfDay, lte: endOfDay }, deletedAt: null }
      }),
      prisma.booking.findMany({
        where: { deletedAt: null },
        select: { id: true, date: true, status: true, category: true, customData: true, client: { select: { name: true } } }
      })
    ]);

    const incomeItem = typeAgg.find(t => t.type === 'INCOME');
    const expenseItem = typeAgg.find(t => t.type === 'EXPENSE');
    const periodIncome = toNumber(incomeItem?._sum.amount);
    const periodExpense = toNumber(expenseItem?._sum.amount);

    const dailyDataMap: Record<string, { date: string, income: number, expense: number }> = {};
    const curr = new Date(startOfDay);
    while (curr <= endOfDay) {
      const dateStr = curr.toISOString().split('T')[0];
      dailyDataMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    dailyTotals.forEach(row => {
      const day = dailyDataMap[row.day];
      if (day) {
        if (row.type === 'INCOME') day.income += toNumber(row.total);
        if (row.type === 'EXPENSE') day.expense += toNumber(row.total);
      }
    });

    const revenueChartData = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

    const pendingAlbumsRaw: PendingAlbum[] = [];
    bookingsForChart.forEach(b => {
      const cd = asJsonRecord(b.customData);
      const inclusions = cd.fld_b_inclusions;

      const isAlbum = b.category === 'Album' ||
                     ((typeof inclusions === 'string' || Array.isArray(inclusions)) && inclusions.includes('Album')) ||
                     cd.album_status ||
                     cd.fld_b_album_status;
      const bStatus = (b.status || '').trim().toLowerCase();
      
      const qualifiesAsAlbum = isAlbum || ['shoot completed', 'designing', 'printing', 'album work in progress'].includes(bStatus);
      
      if (qualifiesAsAlbum) {
        const albumStatus = typeof cd.fld_b_album_status === 'string' && cd.fld_b_album_status ? cd.fld_b_album_status : 'Pending';
        if (albumStatus !== 'Delivered') {
          pendingAlbumsRaw.push({
            id: b.id,
            clientName: b.client?.name || 'Unknown',
            status: albumStatus,
            date: b.date
          });
        }
      }
    });

    pendingAlbumsRaw.sort((a, b) => a.date.getTime() - b.date.getTime());
    const bookingBreakdownData = pendingAlbumsRaw.slice(0, 5);

    const [prefsDoc, upcomingAllBookings] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'UI_PREFERENCES' }, select: { value: true } }),
      prisma.booking.findMany({
        where: { deletedAt: null, date: { gte: today } },
        select: { date: true, order: { select: { package: true } } }
      }),
    ]);
    const prefs = asJsonRecord(prefsDoc?.value);
    const hotDateBenchmark = Number(prefs.hotDateBenchmark ?? prefs.hotDateThreshold ?? 50000);

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
