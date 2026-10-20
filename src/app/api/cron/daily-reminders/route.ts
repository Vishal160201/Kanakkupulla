import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotificationsForUsers } from "@/lib/notifications";
import { verifyCronRequest } from "@/lib/authz";

/** Assigned photographers are stored as ids or `{ id }` objects. */
function photographerIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p: unknown) => {
    if (typeof p === "string") return [p];
    if (p && typeof p === "object" && "id" in p && typeof p.id === "string") return [p.id];
    return [];
  });
}

export async function GET(request: Request) {
  try {
    const denied = verifyCronRequest(request);
    if (denied) return denied;

    // Calculate exactly tomorrow's date range (start of day to end of day)
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: tomorrowStart,
          lt: tomorrowEnd,
        },
        deletedAt: null,
        status: {
          not: "Cancelled", // Don't remind about cancelled shoots
        },
      },
      select: {
        id: true,
        category: true,
        location: true,
        photographers: true,
        client: { select: { name: true } },
      },
    });

    if (upcomingBookings.length === 0) {
      return NextResponse.json({ success: true, message: "No bookings for tomorrow." });
    }

    // Get admins as fallback
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
    });

    let notificationsSent = 0;

    for (const booking of upcomingBookings) {
      // If photographers are assigned, notify them. Otherwise, notify admins.
      const assigned = photographerIds(booking.photographers);
      const recipients = assigned.length > 0 ? assigned : admins.map((admin) => admin.id);

      const created = await createNotificationsForUsers(recipients, {
        title: `Shoot Tomorrow!`,
        message: `Reminder: ${booking.category} shoot for ${booking.client.name} is scheduled for tomorrow at ${booking.location || 'TBD'}.`,
        type: "HOT_DATE_ALERT",
        actionUrl: `/bookings/details/${booking.id}`,
        entityId: booking.id,
        entityType: "booking",
        priority: "HIGH",
      });
      notificationsSent += created.length;
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${notificationsSent} reminders for ${upcomingBookings.length} bookings.`
    });

  } catch (error) {
    console.error("Daily reminders cron failed:", error);
    return NextResponse.json(
      { error: "Failed to run cron job" },
      { status: 500 }
    );
  }
}
