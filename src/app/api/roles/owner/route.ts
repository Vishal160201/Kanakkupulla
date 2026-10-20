import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOwner } from "@/lib/authz";
import { getOwnerNotifications, normalizeNotifications, OWNER_NOTIFICATIONS_SETTING } from "@/lib/roles";
import { parseJsonBody } from "@/lib/validations/http";
import { ownerNotificationsSchema } from "@/lib/validations/admin";

// PUT /api/roles/owner — which alerts owners receive. Owner only.
export async function PUT(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, ownerNotificationsSchema);
  if (body.error) return body.error;

  try {
    const value = normalizeNotifications({ ...(await getOwnerNotifications()), ...body.data.notifications }, "OWNER");
    await prisma.systemSetting.upsert({
      where: { key: OWNER_NOTIFICATIONS_SETTING },
      update: { value },
      create: { key: OWNER_NOTIFICATIONS_SETTING, value },
    });
    return NextResponse.json({ owner: { notifications: value } });
  } catch (error) {
    console.error("Failed to update owner alerts:", error);
    return NextResponse.json({ error: "Failed to update owner alerts" }, { status: 500 });
  }
}
