import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
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

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.auth || !keys.p256dh) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Save or update subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        auth: keys.auth,
        p256dh: keys.p256dh,
        userId: user.id
      },
      create: {
        endpoint,
        auth: keys.auth,
        p256dh: keys.p256dh,
        userId: user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save push subscription" },
      { status: 500 }
    );
  }
}
