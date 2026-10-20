import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { can, getSessionUser } from "@/lib/authz";
import { asJsonRecord } from "@/lib/validations/common";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  // The upcoming-shoot banner is studio data: only for people who can see bookings
  if (!user || !(await can(user, "bookings", "VIEW"))) {
    return NextResponse.json({ show: false });
  }

  try {
    // 1. Fetch banner settings
    const bannerSetting = await prisma.systemSetting.findUnique({
      where: { key: "BANNER_SETTINGS" }
    });

    const settings = {
      bannerEnabled: true,
      bannerTime1: "09:00",
      bannerTime2: "17:00",
      ...asJsonRecord(bannerSetting?.value),
    };

    if (!settings.bannerEnabled) {
      return NextResponse.json({ show: false });
    }

    // 2. Calculate tomorrow and day after tomorrow (in local time)
    const todayLocal = new Date();
    todayLocal.setHours(todayLocal.getHours() + 5);
    todayLocal.setMinutes(todayLocal.getMinutes() + 30);
    todayLocal.setHours(0, 0, 0, 0);
    
    const tomorrowLocalStart = new Date(todayLocal);
    tomorrowLocalStart.setDate(tomorrowLocalStart.getDate() + 1);
    const tomorrowLocalEnd = new Date(tomorrowLocalStart);
    tomorrowLocalEnd.setHours(23, 59, 59, 999);

    const dayAfterLocalStart = new Date(todayLocal);
    dayAfterLocalStart.setDate(dayAfterLocalStart.getDate() + 2);
    const dayAfterLocalEnd = new Date(dayAfterLocalStart);
    dayAfterLocalEnd.setHours(23, 59, 59, 999);

    // Convert back to UTC for querying
    const toUTC = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(copy.getHours() - 5);
      copy.setMinutes(copy.getMinutes() - 30);
      return copy;
    };

    const tStartUTC = toUTC(tomorrowLocalStart);
    const dEndUTC = toUTC(dayAfterLocalEnd);

    // 3. Query upcoming bookings
    const bookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: tStartUTC,
          lte: dEndUTC
        },
        deletedAt: null
      },
      select: {
        id: true,
        date: true,
        time: true,
        category: true,
        status: true,
        location: true,
        client: {
          select: { name: true }
        }
      },
      orderBy: {
        date: 'asc'
      },
      take: 200
    });

    if (bookings.length === 0) {
      return NextResponse.json({ show: false });
    }

    // 4. Group bookings
    const day1: typeof bookings = [];
    const day2: typeof bookings = [];

    const tomorrowUTCStart = toUTC(tomorrowLocalStart);
    const tomorrowUTCEnd = toUTC(tomorrowLocalEnd);

    for (const b of bookings) {
      const bDate = new Date(b.date);
      if (bDate >= tomorrowUTCStart && bDate <= tomorrowUTCEnd) {
        day1.push(b);
      } else {
        day2.push(b);
      }
    }

    return NextResponse.json({
      show: true,
      settings,
      day1,
      day2
    });

  } catch (error) {
    console.error("Banner API Error:", error);
    return NextResponse.json({ show: false });
  }
}
