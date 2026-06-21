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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dbBookings = await prisma.booking.findMany({
      where: { 
        deletedAt: null,
        date: { gte: thirtyDaysAgo }
      },
      include: { client: true, order: true },
      orderBy: { date: 'desc' }
    });

    const systemSetting = await prisma.systemSetting.findUnique({
      where: { key: "UI_PREFERENCES" }
    });
    const prefs = systemSetting?.value as any || { currencySymbol: "₹", hotDateThreshold: 50000 };

    const bookings = dbBookings.map(b => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      title: b.client.name,
      category: b.category,
      date: b.date.toISOString().split('T')[0],
      time: b.time,
      location: b.location,
      phone: b.client.phone,
      email: b.client.email || '',
      package: b.order?.package.toString() || '',
      advance: b.order?.advance.toString() || '',
      due: b.order?.due.toString() || '',
      status: b.status as any,
      customData: (b as any).customData || {}
    }));

    // Calculate Metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    let immediateShoots = 0; // Today and Tomorrow
    let thisWeekShoots = 0; // Next 7 days
    let pendingDueAmount = 0; // Due amounts in next 14 days
    let unconfirmedShoots = 0; // Pending status in next 14 days
    // Hot Date calculation based on highest combined package value
    const upcomingDateStats: Record<string, { count: number, totalPackage: number }> = {};
    let hotDateStr = "";
    let maxPackageValue = 0;
    let hotDateCount = 0;
    let albumInProgressCount = 0;
    let pendingAlbumWorksCount = 0;

    bookings.forEach(booking => {
      const [year, month, day] = booking.date.split('-').map(Number);
      const bookingDate = new Date(year, month - 1, day);
      bookingDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((bookingDate.getTime() - today.getTime()) / msPerDay);

      if (diffDays >= 0) {
        if (diffDays <= 1) immediateShoots++;
        if (diffDays <= 7) thisWeekShoots++;
        
        if (diffDays <= 14) {
          if (booking.status === 'PENDING') unconfirmedShoots++;
          
          const due = parseFloat(booking.due || "0");
          if (due > 0) pendingDueAmount += due;
        }

        // Track stats for hot date
        const dStr = booking.date; // already YYYY-MM-DD
        const pkgValue = parseFloat(booking.package || '0');
        
        if (!upcomingDateStats[dStr]) {
          upcomingDateStats[dStr] = { count: 0, totalPackage: 0 };
        }
        upcomingDateStats[dStr].count += 1;
        upcomingDateStats[dStr].totalPackage += pkgValue;

        // Update max logic
        if (upcomingDateStats[dStr].totalPackage > maxPackageValue) {
          maxPackageValue = upcomingDateStats[dStr].totalPackage;
          hotDateStr = dStr;
          hotDateCount = upcomingDateStats[dStr].count;
        }
      }

      // Album metrics - calculated for all bookings (including past)
      const isAlbum = booking.category === 'Album' || 
                     booking.customData?.fld_b_inclusions?.includes('Album') || 
                     booking.customData?.album_status;
      
      const bStatus = (booking.status || '').trim().toLowerCase();

      if (bStatus === 'shoot completed' || (isAlbum && bStatus === 'pending')) {
        pendingAlbumWorksCount++;
      } else if (bStatus === 'designing' || bStatus === 'printing' || bStatus === 'album work in progress') {
        albumInProgressCount++;
      } else if (isAlbum && bStatus !== 'delivered' && bStatus !== 'shoot completed' && bStatus !== 'pending') {
        albumInProgressCount++;
      }
    });

    return NextResponse.json({
      bookings,
      prefs,
      metrics: {
        immediateShoots,
        thisWeekShoots,
        pendingDueAmount,
        unconfirmedShoots,
        hotDateStr,
        maxPackageValue,
        hotDateCount,
        albumInProgressCount,
        pendingAlbumWorksCount
      }
    });

  } catch (error) {
    console.error("Bookings Overview API Error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings overview" }, { status: 500 });
  }
}
