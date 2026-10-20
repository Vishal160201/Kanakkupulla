import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { pushSubscriptionSchema } from "@/lib/validations/notifications";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const parsed = await parseJsonBody(request, pushSubscriptionSchema);
    if (parsed.error) return parsed.error;
    const { endpoint, keys } = parsed.data;

    // Save or update subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { auth: keys.auth, p256dh: keys.p256dh, userId },
      create: { endpoint, auth: keys.auth, p256dh: keys.p256dh, userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json(
      { error: "Failed to save push subscription" },
      { status: 500 }
    );
  }
}
