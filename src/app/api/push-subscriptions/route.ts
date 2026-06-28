
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/push-subscriptions
export async function POST(req: Request) {
  try {
    const { userId, endpoint, p256dh, auth } = await req.json();
    const newPushSubscription = await prisma.pushSubscription.create({
      data: { userId, endpoint, p256dh, auth },
    });
    return NextResponse.json(newPushSubscription, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
