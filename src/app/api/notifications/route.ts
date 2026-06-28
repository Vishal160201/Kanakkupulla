import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const priority = searchParams.get("priority");
    const isReadParam = searchParams.get("isRead");

    const whereClause: any = { userId: user.id };
    // Removed priority temporarily as requested
    if (isReadParam !== null) {
      whereClause.isRead = isReadParam === 'true';
    }

    // Don't fetch notifications that are currently snoozed
    const now = new Date();
    whereClause.OR = [
      { snoozedUntil: null },
      { snoozedUntil: { lt: now } }
    ];

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const reminderTypes = [
      'ORDER_STATUS_STALE',
      'BOOKING_STATUS_STALE',
      'PAYMENT_DUE_REMINDER',
      'ADVANCE_NOT_COLLECTED',
      'GALLERY_NOT_DELIVERED',
      'ALBUM_PENDING_REMINDER'
    ];

    const unreadRegularCount = await prisma.notification.count({
      where: { 
        userId: user.id, 
        isRead: false,
        type: { notIn: reminderTypes as any[] },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }]
      },
    });

    const unreadReminderCount = await prisma.notification.count({
      where: { 
        userId: user.id, 
        isRead: false,
        type: { in: reminderTypes as any[] },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }]
      },
    });

    return NextResponse.json({ notifications, unreadCount: unreadRegularCount, unreadReminderCount });
  } catch (error: any) {
    console.error("API Notifications Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error.message },
      { status: 500 }
    );
  }
}
