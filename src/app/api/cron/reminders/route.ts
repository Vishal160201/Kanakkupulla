import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { NotificationType, Prisma } from '@prisma/client';
import { verifyCronRequest } from '@/lib/authz';
import { asJsonRecord } from '@/lib/validations/common';

type ReminderType = Extract<NotificationType,
  'ORDER_STATUS_STALE' | 'BOOKING_STATUS_STALE' | 'PAYMENT_DUE_REMINDER' | 'ADVANCE_NOT_COLLECTED' | 'GALLERY_NOT_DELIVERED' | 'ALBUM_PENDING_REMINDER'>;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const denied = verifyCronRequest(request);
    if (denied) return denied;

    // 1. Fetch thresholds
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'reminder_threshold_order_stale',
            'reminder_threshold_order_ready',
            'reminder_threshold_advance',
            'reminder_threshold_gallery',
            'reminder_threshold_album',
            'reminder_threshold_payment_due',
          ]
        }
      }
    });

    const getThreshold = (key: string, defaultValue: number) => {
      const setting = settings.find(s => s.key === key);
      const value = asJsonRecord(setting?.value);
      if ('days' in value) {
        return Number(value.days);
      }
      return defaultValue;
    };

    const thresholds = {
      orderStale: getThreshold('reminder_threshold_order_stale', 3),
      orderReady: getThreshold('reminder_threshold_order_ready', 2),
      advance: getThreshold('reminder_threshold_advance', 7),
      gallery: getThreshold('reminder_threshold_gallery', 14),
      album: getThreshold('reminder_threshold_album', 30),
      paymentDue: getThreshold('reminder_threshold_payment_due', 3),
    };

    const now = new Date();

    // Duplicate reminder check: skip if same entityId + type notification exists with createdAt > now() - 24h OR snoozedUntil > now()
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);

    const existingReminders = await prisma.notification.findMany({
      where: {
        type: {
          in: [
            'ORDER_STATUS_STALE',
            'BOOKING_STATUS_STALE',
            'PAYMENT_DUE_REMINDER',
            'ADVANCE_NOT_COLLECTED',
            'GALLERY_NOT_DELIVERED',
            'ALBUM_PENDING_REMINDER'
          ]
        },
        OR: [
          { createdAt: { gt: cutoffDate } },
          { snoozedUntil: { gt: now } }
        ]
      },
      select: { entityId: true, type: true }
    });

    const activeReminderSet = new Set<string>();
    for (const r of existingReminders) {
      activeReminderSet.add(`${r.type}_${r.entityId}`);
    }

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const adminIds = admins.map(a => a.id);

    // Reminders are collected here and inserted with a single createMany at the end
    const pendingNotifications: Prisma.NotificationCreateManyInput[] = [];
    const createReminders = (type: ReminderType, entityId: string, title: string, message: string, actionUrl: string) => {
      const key = `${type}_${entityId}`;
      if (activeReminderSet.has(key)) return; // Already have an active/snoozed reminder
      activeReminderSet.add(key);

      for (const userId of adminIds) {
        pendingNotifications.push({
          userId,
          type,
          title,
          message,
          actionUrl,
          entityId,
          entityType: type.startsWith('ORDER') ? 'order' : 'booking',
          priority: 'HIGH',
        });
      }
    };

    // 2. Orders in PENDING/IN_PRODUCTION for > X days
    const staleOrderDate = new Date();
    staleOrderDate.setDate(staleOrderDate.getDate() - thresholds.orderStale);
    
    const staleOrders = await prisma.productOrder.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        updatedAt: { lt: staleOrderDate }
      },
      select: { id: true, orderNumber: true, clientName: true, status: true }
    });

    for (const order of staleOrders) {
      createReminders(
        'ORDER_STATUS_STALE',
        order.id,
        `Stale Order: ${order.orderNumber || 'Unknown'}`,
        `Order for ${order.clientName} has been ${order.status} for ${thresholds.orderStale}+ days.`,
        `/gifts`
      );
    }

    // 3. Orders READY_FOR_PICKUP > X days
    const readyOrderDate = new Date();
    readyOrderDate.setDate(readyOrderDate.getDate() - thresholds.orderReady);

    const readyOrders = await prisma.productOrder.findMany({
      where: {
        status: 'READY',
        updatedAt: { lt: readyOrderDate }
      },
      select: { id: true, clientName: true }
    });

    for (const order of readyOrders) {
      createReminders(
        'ORDER_STATUS_STALE',
        order.id,
        `Order Ready for Pickup`,
        `Order for ${order.clientName} ready but not collected for ${thresholds.orderReady}+ days.`,
        `/gifts`
      );
    }

    // 4. Bookings missing advance payments (event < 7 days)
    const upcomingEventDate = new Date();
    upcomingEventDate.setDate(upcomingEventDate.getDate() + thresholds.advance);

    const advanceMissingBookings = await prisma.booking.findMany({
      where: {
        date: { gte: now, lte: upcomingEventDate },
        deletedAt: null,
        status: 'Confirmed',
        order: {
          advance: 0
        }
      },
      select: { id: true, date: true, client: { select: { name: true } } }
    });

    for (const booking of advanceMissingBookings) {
      createReminders(
        'ADVANCE_NOT_COLLECTED',
        booking.id,
        `Advance Missing`,
        `No advance collected for ${booking.client?.name} shoot on ${booking.date.toISOString().split('T')[0]}.`,
        `/bookings/details/${booking.id}`
      );
    }

    // 5. Bookings COMPLETED with galleryDelivered = false > 14 days
    const galleryDate = new Date();
    galleryDate.setDate(galleryDate.getDate() - thresholds.gallery);

    const galleryPendingBookingsRaw = await prisma.booking.findMany({
      where: {
        date: { lt: galleryDate },
        deletedAt: null,
        galleryDelivered: false,
      },
      select: { id: true, customData: true, client: { select: { name: true } } }
    });

    const galleryPendingBookings = galleryPendingBookingsRaw.filter(b =>
      asJsonRecord(b.customData).fld_b_album_status !== 'Delivered'
    );

    for (const booking of galleryPendingBookings) {
      createReminders(
        'GALLERY_NOT_DELIVERED',
        booking.id,
        `Gallery Pending`,
        `Gallery not delivered for ${booking.client?.name} (event was ${thresholds.gallery}+ days ago).`,
        `/bookings/details/${booking.id}`
      );
    }

    // 6. Bookings with album status PENDING > 30 days
    const albumDate = new Date();
    albumDate.setDate(albumDate.getDate() - thresholds.album);

    const albumPendingBookingsRaw = await prisma.booking.findMany({
      where: {
        date: { lt: albumDate },
        deletedAt: null,
      },
      select: { id: true, customData: true, client: { select: { name: true } } }
    });

    const albumPendingBookings = albumPendingBookingsRaw.filter(b =>
      asJsonRecord(b.customData).fld_b_album_status === 'Pending'
    );

    for (const booking of albumPendingBookings) {
      createReminders(
        'ALBUM_PENDING_REMINDER',
        booking.id,
        `Album Pending`,
        `Album status still PENDING for ${booking.client?.name} (event was ${thresholds.album}+ days ago).`,
        `/bookings/details/${booking.id}`
      );
    }

    // 7. Payment dues approaching (Due < 3 days with dueAmount > 0)
    // For Bookings
    const paymentDueDate = new Date();
    paymentDueDate.setDate(paymentDueDate.getDate() + thresholds.paymentDue);

    const dueBookings = await prisma.booking.findMany({
      where: {
        date: { gte: now, lte: paymentDueDate },
        deletedAt: null,
        order: {
          due: { gt: 0 }
        }
      },
      select: { id: true, date: true, client: { select: { name: true } }, order: { select: { due: true } } }
    });

    for (const booking of dueBookings) {
      createReminders(
        'PAYMENT_DUE_REMINDER',
        booking.id,
        `Payment Due Soon`,
        `₹${booking.order?.due} due for ${booking.client?.name}'s shoot on ${booking.date.toISOString().split('T')[0]}.`,
        `/bookings/details/${booking.id}`
      );
    }

    // For Product Orders
    const dueOrders = await prisma.productOrder.findMany({
      where: {
        dueDate: { gte: now, lte: paymentDueDate },
        // assuming ProductOrder doesn't have `dueAmount` field easily queriable?
        // Let's just alert if they have a dueDate in that range and status isn't DELIVERED
        status: { not: 'DELIVERED' }
      },
      select: {
        id: true,
        clientName: true,
        dueDate: true,
        customData: true,
        discountAmount: true,
        transactions: { where: { deletedAt: null, type: 'INCOME' }, select: { amount: true } }
      }
    });

    for (const order of dueOrders) {
      // Skip orders that are already fully paid (total lives in customData.amount)
      const total = parseFloat(String(asJsonRecord(order.customData).amount || '0')) || 0;
      const paid = order.transactions.reduce((sum, t) => sum + t.amount, 0);
      if (total > 0 && paid + (order.discountAmount || 0) >= total) continue;

      createReminders(
        'PAYMENT_DUE_REMINDER',
        order.id,
        `Order Payment Due`,
        `Payment/Pickup due for ${order.clientName}'s order by ${order.dueDate?.toISOString().split('T')[0]}.`,
        `/gifts`
      );
    }

    if (pendingNotifications.length > 0) {
      await prisma.notification.createMany({ data: pendingNotifications });
    }

    return NextResponse.json({ success: true, notificationsCreated: pendingNotifications.length });
  } catch (error) {
    console.error('Reminder Cron Error:', error);
    return NextResponse.json({ error: 'Failed to run reminders' }, { status: 500 });
  }
}
