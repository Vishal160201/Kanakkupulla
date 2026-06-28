import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

let uiPreferencesCache: { value: any; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

async function getUiPreferences() {
  if (uiPreferencesCache && Date.now() - uiPreferencesCache.timestamp < CACHE_TTL) {
    return uiPreferencesCache.value;
  }
  const setting = await prisma.systemSetting.findUnique({ where: { key: "UI_PREFERENCES" } });
  const value = (setting?.value as any) || { currencySymbol: "₹", hotDateBenchmark: 50000 };
  uiPreferencesCache = { value, timestamp: Date.now() };
  return value;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    const next8Days = new Date(today);
    next8Days.setDate(today.getDate() + 8);
    const next14Days = new Date(today);
    next14Days.setDate(today.getDate() + 14);

    // Cached system setting
    const prefs = await getUiPreferences();

    // Fetch only needed fields for the 30-day window
    const dbBookings = await prisma.booking.findMany({
      where: { deletedAt: null, date: { gte: thirtyDaysAgo } },
      select: {
        id: true,
        bookingNumber: true,
        category: true,
        date: true,
        time: true,
        status: true,
        customData: true,
        client: { select: { name: true, phone: true, email: true } },
        order: { select: { package: true, advance: true, due: true } },
      },
      orderBy: { date: 'desc' }
    });

    const bookings = dbBookings.map(b => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      title: b.client.name,
      category: b.category,
      date: b.date.toISOString().split('T')[0],
      time: (b as any).time,
      status: b.status as any,
      customData: (b as any).customData || {}
    }));

    // Use SQL aggregates instead of JS computation
    const [immediateShoots, thisWeekShoots, unconfirmedShoots, pendingDueAgg] = await Promise.all([
      // Bookings today or tomorrow
      prisma.booking.count({
        where: { deletedAt: null, date: { gte: today, lt: dayAfterTomorrow } }
      }),
      // Bookings in next 7 days (excluding today)
      prisma.booking.count({
        where: { deletedAt: null, date: { gte: tomorrow, lt: next8Days } }
      }),
      // Pending bookings in next 14 days
      prisma.booking.count({
        where: { deletedAt: null, status: 'PENDING', date: { gte: today, lt: next14Days } }
      }),
      // Sum of due amounts in next 14 days (via orders)
      prisma.order.aggregate({
        _sum: { due: true },
        where: { booking: { date: { gte: today, lt: next14Days }, deletedAt: null } }
      }),
    ]);

    // Hot date: most valuable upcoming date — computed from loaded data
    // (need customData for album metrics which is already fetched)
    const dateStats = new Map<string, { count: number; totalPackage: number }>();
    for (const b of dbBookings) {
      if (b.date >= today) {
        const dStr = b.date.toISOString().split('T')[0];
        const existing = dateStats.get(dStr) || { count: 0, totalPackage: 0 };
        existing.count++;
        existing.totalPackage += b.order?.package || 0;
        dateStats.set(dStr, existing);
      }
    }
    // Find all hot dates
    const hotDates: { date: string; totalAmount: number; count: number }[] = [];
    const benchmark = prefs.hotDateBenchmark || 50000;
    for (const [dStr, stats] of dateStats) {
      if (stats.totalPackage >= benchmark) {
        hotDates.push({ date: dStr, totalAmount: stats.totalPackage, count: stats.count });
      }
    }
    hotDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Album metrics: computed from loaded data (needs customData which is JSON)
    let albumInProgressCount = 0;
    let pendingAlbumWorksCount = 0;
    for (const b of dbBookings) {
      const isAlbum = b.category === 'Album' ||
        (b.customData as any)?.fld_b_inclusions?.includes('Album') ||
        (b.customData as any)?.album_status;
      const bStatus = (b.status || '').trim().toLowerCase();
      if (bStatus === 'shoot completed' || (isAlbum && bStatus === 'pending')) {
        pendingAlbumWorksCount++;
      } else if (bStatus === 'designing' || bStatus === 'printing' || bStatus === 'album work in progress') {
        albumInProgressCount++;
      } else if (isAlbum && bStatus !== 'delivered' && bStatus !== 'shoot completed' && bStatus !== 'pending') {
        albumInProgressCount++;
      }
    }

    return NextResponse.json({
      bookings,
      prefs,
      metrics: {
        immediateShoots,
        thisWeekShoots,
        pendingDueAmount: pendingDueAgg._sum.due || 0,
        unconfirmedShoots,
        hotDates,
        albumInProgressCount,
        pendingAlbumWorksCount
      }
    });

  } catch (error) {
    console.error("Bookings Overview API Error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings overview" }, { status: 500 });
  }
}
