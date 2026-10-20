import { NextResponse } from "next/server";
import type { NotificationType, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { parseSearchParams } from "@/lib/validations/http";
import { notificationListQuerySchema } from "@/lib/validations/notifications";

const REMINDER_TYPES: NotificationType[] = [
  'ORDER_STATUS_STALE',
  'BOOKING_STATUS_STALE',
  'PAYMENT_DUE_REMINDER',
  'ADVANCE_NOT_COLLECTED',
  'GALLERY_NOT_DELIVERED',
  'ALBUM_PENDING_REMINDER'
];

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const query = parseSearchParams(request, notificationListQuerySchema);
    if (query.error) return query.error;
    const { limit, priority, isRead } = query.data;

    // Don't fetch notifications that are currently snoozed
    const now = new Date();
    const notSnoozed: Prisma.NotificationWhereInput["OR"] = [
      { snoozedUntil: null },
      { snoozedUntil: { lt: now } }
    ];

    const whereClause: Prisma.NotificationWhereInput = { userId, OR: notSnoozed };
    if (priority) whereClause.priority = priority;
    if (isRead !== undefined) whereClause.isRead = isRead === 'true';

    const [notifications, unreadRegularCount, unreadReminderCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false, type: { notIn: REMINDER_TYPES }, OR: notSnoozed },
      }),
      prisma.notification.count({
        where: { userId, isRead: false, type: { in: REMINDER_TYPES }, OR: notSnoozed },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount: unreadRegularCount, unreadReminderCount });
  } catch (error) {
    console.error("API Notifications Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
