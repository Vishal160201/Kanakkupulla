import prisma from "./prisma";
import webpush, { WebPushError } from "web-push";
import nodemailer from "nodemailer";
import { Prisma, type NotificationType, type NotificationPriority } from "@prisma/client";
import { botFetch } from "./whatsappBot";
import { getOwnerNotifications, listRoles } from "./roles";
import type { NotificationTypeKey } from "./access";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));

const pushEnabled = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (pushEnabled) {
  webpush.setVapidDetails(
    "mailto:admin@moondotstudio.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

// Email is only sent when SMTP is configured.
const emailEnabled = !!process.env.SMTP_HOST;
const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

// WhatsApp delivery is temporarily disabled.
const WHATSAPP_ENABLED = false;

/** Absolute link for an in-app path, or null when no public app URL is configured. */
function absoluteLink(actionUrl?: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (!actionUrl || !base) return null;
  return `${base.replace(/\/$/, "")}${actionUrl}`;
}

export type NotificationContent = {
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  entityId?: string;
  entityType?: string;
  priority?: NotificationPriority;
};

const recipientSelect = {
  id: true,
  email: true,
  phone: true,
  pushNotifications: true,
  emailNotifications: true,
  notificationPrefs: true,
  pushSubscriptions: { select: { id: true, endpoint: true, auth: true, p256dh: true } },
} satisfies Prisma.UserSelect;

type Recipient = Prisma.UserGetPayload<{ select: typeof recipientSelect }>;

/** False when the user has explicitly disabled this notification type. */
function wantsType(user: Recipient, type: NotificationType): boolean {
  const prefs = user.notificationPrefs;
  if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
    return (prefs as Prisma.JsonObject)[type] !== false;
  }
  return true;
}

/** Sends push / email / WhatsApp for an already-stored notification. Never throws. */
async function deliver(user: Recipient, content: NotificationContent): Promise<string[]> {
  const { title, message, type, actionUrl, priority = "NORMAL" } = content;
  const link = absoluteLink(actionUrl);
  const expiredSubscriptionIds: string[] = [];

  // 1. Web Push
  if (pushEnabled && user.pushNotifications && user.pushSubscriptions.length > 0) {
    const payload = JSON.stringify({ title, body: message, url: actionUrl || "/", icon: "/assets/logo.png" });
    await Promise.all(
      user.pushSubscriptions.map(async sub => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, payload);
        } catch (e) {
          if (e instanceof WebPushError && (e.statusCode === 410 || e.statusCode === 404)) {
            expiredSubscriptionIds.push(sub.id);
          } else {
            console.error("Web push failed:", e);
          }
        }
      })
    );
  }

  // 2. Email
  if (transporter && user.emailNotifications && user.email) {
    try {
      await transporter.sendMail({
        from: '"Moondot Studio" <notifications@moondotstudio.com>',
        to: user.email,
        subject: title,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #ea580c; font-weight: bold; font-size: 24px;">Moondot Studio</h2>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(message)}</p>
            ${link ? `<a href="${escapeHtml(link)}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Details</a>` : ''}
          </div>`,
      });
    } catch (e) {
      console.error("Notification email failed:", e);
    }
  }

  // 3. WhatsApp
  if (WHATSAPP_ENABLED && user.phone) {
    const cleanPhone = user.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length >= 10) {
      let prefix = "*Moondot Notification*";
      if (priority === "HIGH") prefix = "*High Priority Alert*";
      else if (type === "BOOKING_CREATED") prefix = "*New Booking Alert*";
      else if (type === "BOOKING_UPDATED") prefix = "*Status Update*";

      let text = `${prefix}\n\n${message}`;
      if (link) text += `\n\nView details: ${link}`;
      try {
        await botFetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: cleanPhone, message: text }),
        });
      } catch (e) {
        console.error("WhatsApp notification failed:", e);
      }
    }
  }

  return expiredSubscriptionIds;
}

async function removeExpiredSubscriptions(ids: string[]) {
  if (ids.length === 0) return;
  try {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: ids } } });
  } catch (e) {
    console.error("Failed to remove expired push subscriptions:", e);
  }
}

export async function createNotification(params: NotificationContent & { userId: string }) {
  const { userId, ...content } = params;
  const { title, message, type, actionUrl, entityId, entityType, priority = "NORMAL" } = content;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: recipientSelect });
    if (!user || !wantsType(user, type)) return null;

    const notification = await prisma.notification.create({
      data: { userId, title, message, type, actionUrl, entityId, entityType, priority },
    });

    await removeExpiredSubscriptions(await deliver(user, content));
    return notification;
  } catch (error) {
    console.error("createNotification failed:", error);
    return null;
  }
}

/** Stores and delivers one notification to each recipient: one query for users, one insert. */
async function notifyRecipients(where: Prisma.UserWhereInput, content: NotificationContent) {
  const { title, message, type, actionUrl, entityId, entityType, priority = "NORMAL" } = content;
  const users = await prisma.user.findMany({ where, select: recipientSelect });
  const recipients = users.filter(user => wantsType(user, type));
  if (recipients.length === 0) return [];

  const notifications = await prisma.notification.createManyAndReturn({
    data: recipients.map(user => ({ userId: user.id, title, message, type, actionUrl, entityId, entityType, priority })),
  });

  const results = await Promise.allSettled(recipients.map(user => deliver(user, content)));
  await removeExpiredSubscriptions(results.flatMap(r => (r.status === "fulfilled" ? r.value : [])));
  return notifications;
}

/** Batched createNotification for an explicit list of users (unknown ids are ignored). */
export async function createNotificationsForUsers(userIds: string[], content: NotificationContent) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return [];
  try {
    return await notifyRecipients({ id: { in: ids } }, content);
  } catch (error) {
    console.error("createNotificationsForUsers failed:", error);
    return [];
  }
}

export async function broadcastNotification(params: NotificationContent & { skipUserId?: string | null }) {
  const { skipUserId, ...content } = params;
  const { type } = content;
  try {
    // Studio alerts go to owners (unless they switched this type off) and to members whose role
    // in any studio shop has it switched on (Roles & Permissions → Notifications).
    const [ownerAlerts, roles] = await Promise.all([getOwnerNotifications(), listRoles()]);
    const roleIds = roles.filter(r => r.notifications[type as NotificationTypeKey] ?? r.key !== "STAFF").map(r => r.id);
    const audience: Prisma.UserWhereInput[] = [];
    if (ownerAlerts[type as NotificationTypeKey] ?? true) audience.push({ role: "OWNER" });
    if (roleIds.length > 0) {
      audience.push({
        role: "MEMBER",
        shopMemberships: { some: { roleId: { in: roleIds }, shop: { type: "STUDIO", isArchived: false } } },
      });
    }
    if (audience.length === 0) return [];

    return await notifyRecipients(
      {
        status: "ACTIVE",
        OR: audience,
        ...(skipUserId ? { id: { not: skipUserId } } : {}),
      },
      content
    );
  } catch (error) {
    console.error("broadcastNotification failed:", error);
    return null;
  }
}
