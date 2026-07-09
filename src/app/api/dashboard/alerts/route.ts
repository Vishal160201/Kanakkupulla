import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await prisma.notification.findMany({
      where: {
        userId: (session.user as any).id,
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
