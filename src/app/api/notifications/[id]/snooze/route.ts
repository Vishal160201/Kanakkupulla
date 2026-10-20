import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/authz';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const { id } = await params;

    // Verify the notification exists and belongs to this user (or user is admin)
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Set snoozedUntil to 24 hours from now
    const snoozeTime = new Date();
    snoozeTime.setHours(snoozeTime.getHours() + 24);

    await prisma.notification.update({
      where: { id },
      data: { snoozedUntil: snoozeTime },
    });

    return NextResponse.json({ success: true, snoozedUntil: snoozeTime });
  } catch (error) {
    console.error('API Notification Snooze Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
