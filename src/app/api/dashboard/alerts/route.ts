import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from "@/lib/authz";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const alerts = await prisma.notification.findMany({
      where: {
        userId: auth.user.id,
        isRead: false,
        priority: 'HIGH',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Alerts API Error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
