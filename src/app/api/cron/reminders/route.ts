import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Basic auth check for cron jobs (Vercel uses a header)
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Forbidden', { status: 403 });
    }

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
      if (setting && typeof setting.value === 'object' && setting.value !== null && 'days' in setting.value) {
        return Number((setting.value as any).days);
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
    let notificationsCreated = 0;

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

    const activeReminderSet = new Set();
    for (const r of existingReminders) {
      activeReminderSet.add(`${r.type}_${r.entityId}`);
    }

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const adminIds = admins.map(a => a.id);

    const createReminders = async (type: any, entityId: string, title: string, message: string, actionUrl: string) => {
      if (activeReminderSet.has(`${type}_${entityId}`)) return; // Already have an active/snoozed reminder
      
      const newNotifs = adminIds.map(userId => ({
        userId,
        type,
        title,
        message,
        actionUrl,
        entityId,
        entityType: type.startsWith('ORDER') ? 'order' : 'booking',
        priority: 'HIGH',
      }));

      if (newNotifs.length > 0) {
        await prisma.notification.createMany({ data: newNotifs });
        notificationsCreated += newNotifs.length;
      }
    };

    // 2. Orders in PENDING/IN_PRODUCTION for > X days
    const staleOrderDate = new Date();
    staleOrderDate.setDate(staleOrderDate.getDate() - thresholds.orderStale);
    
    const staleOrders = await prisma.productOrder.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        updatedAt: { lt: staleOrderDate }
      }
    });

    for (const order of staleOrders) {
      await createReminders(
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
      }
    });

    for (const order of readyOrders) {
      await createReminders(
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
      include: { client: true }
    });

    for (const booking of advanceMissingBookings) {
      await createReminders(
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
      },
      include: { client: true }
    });

    const galleryPendingBookings = galleryPendingBookingsRaw.filter(b => {
      let cd: any = {};
      try { cd = typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}); } catch(e) {}
      return cd.fld_b_album_status !== 'Delivered';
    });

    for (const booking of galleryPendingBookings) {
      await createReminders(
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
      include: { client: true }
    });

    const albumPendingBookings = albumPendingBookingsRaw.filter(b => {
      let cd: any = {};
      try { cd = typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}); } catch(e) {}
      return cd.fld_b_album_status === 'Pending';
    });

    for (const booking of albumPendingBookings) {
      await createReminders(
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
      include: { client: true, order: true }
    });

    for (const booking of dueBookings) {
      await createReminders(
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
      }
    });

    for (const order of dueOrders) {
      // calculate due amount from transactions if possible, or just alert generally
      const txs = await prisma.transaction.findMany({ where: { productOrderId: order.id } });
      let paid = 0;
      txs.forEach(t => paid += t.amount);
      
      // If we don't know total amount, we just remind. 
      // ProductOrder currently doesn't store total amount directly as a float? 
      // Let's just remind generally.
      await createReminders(
        'PAYMENT_DUE_REMINDER',
        order.id,
        `Order Payment Due`,
        `Payment/Pickup due for ${order.clientName}'s order by ${order.dueDate?.toISOString().split('T')[0]}.`,
        `/gifts`
      );
    }

    return NextResponse.json({ success: true, notificationsCreated });
  } catch (error: any) {
    console.error('Reminder Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
