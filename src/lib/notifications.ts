import prisma from "./prisma";
import webpush from "web-push";
import nodemailer from "nodemailer";

const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";

webpush.setVapidDetails(
  "mailto:admin@moondotstudio.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BM7mYrnONkCPpx7wemRCy4R7r7eD8ZuDGAU9NOE-K1gvS7apjLkhRTfYgJ_LonMla20uX61yHvbt1yUak20CXiI",
  process.env.VAPID_PRIVATE_KEY || "WDeshUo0oOmE6nvY5lOXNHIZrmoGbHbSUf6m5AVDbpY"
);

// Ethereal placeholder for dev environments
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  auth: {
    user: process.env.SMTP_USER || "test@example.com",
    pass: process.env.SMTP_PASS || "testpass",
  },
});

import { NotificationType, NotificationPriority } from "@prisma/client";

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  entityId?: string;
  entityType?: string;
  priority?: NotificationPriority;
}) {
  const { userId, title, message, type, actionUrl, entityId, entityType, priority = "NORMAL" } = params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pushSubscriptions: true },
    });

    if (!user) return null;

    // Check notification preferences
    if (user.notificationPrefs) {
      const prefs = user.notificationPrefs as Record<string, boolean>;
      if (prefs[type] === false) {
        return null; // User disabled this type
      }
    }

    // 1. Create in Database
    const notification = await prisma.notification.create({
      data: { userId, title, message, type, actionUrl, entityId, entityType, priority },
    });

    // 2. Send Web Push
    if (user.pushNotifications && user.pushSubscriptions.length > 0) {
      const payload = JSON.stringify({
        title,
        body: message,
        url: actionUrl || "/",
        icon: "/assets/logo.png"
      });

      for (const sub of user.pushSubscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh }
          }, payload);
        } catch (e: any) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } else {
          }
        }
      }
    }

    // 3. Send Email
    if (user.emailNotifications && user.email) {
      try {
        await transporter.sendMail({
          from: '"Moondot Studio" <notifications@moondotstudio.com>',
          to: user.email,
          subject: title,
          html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #ea580c; font-weight: bold; font-size: 24px;">Moondot Studio</h2>
            <h3>${title}</h3>
            <p>${message}</p>
            ${actionUrl ? `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${actionUrl}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Details</a>` : ''}
          </div>`
        });
      } catch (e) {
      }
    }

    // 4. Send WhatsApp
    if (user.phone) {
       const cleanPhone = user.phone.replace(/[^0-9]/g, '');
       if (cleanPhone.length >= 10) {
         let prefix = '🔔 *Moondot Notification*';
         if (priority === 'HIGH') prefix = '🚨 *High Priority Alert*';
         else if (type === 'BOOKING_CREATED') prefix = '🆕 *New Booking Alert*';
         else if (type === 'BOOKING_UPDATED') prefix = '🔄 *Status Update*';

         let text = `${prefix}\n\n${message}`;
         if (actionUrl) {
            text += `\n\nView details: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${actionUrl}`;
         }
         try {
           /* WHATSAPP TEMPORARILY DISABLED
           await fetch(`${BOT_URL}/api/send`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ to: cleanPhone, message: text })
           });
           */
         } catch (e) {
         }
       }
    }

    return notification;
  } catch (error) {
    return null;
  }
}

export async function broadcastNotification(params: {
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  entityId?: string;
  entityType?: string;
  priority?: NotificationPriority;
  skipUserId?: string | null;
}) {
  const { skipUserId, ...notificationParams } = params;
  try {
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, role: true },
    });
    
    // Fetch role permissions for this notification type
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { permission: `notify_${notificationParams.type}` }
    });
    
    const rolesEnabled = rolePermissions.filter(rp => rp.enabled).map(rp => rp.role);
    
    // Always include ADMINs even if not explicitly set (or respect their setting if set)
    const adminPerm = rolePermissions.find(rp => rp.role === 'ADMIN');
    if (!adminPerm || adminPerm.enabled) {
      if (!rolesEnabled.includes('ADMIN')) rolesEnabled.push('ADMIN');
    }

    const results = await Promise.allSettled(
      users
        .filter(user => !(skipUserId && user.id === skipUserId))
        .filter(user => rolesEnabled.includes(user.role))
        .map(user => createNotification({ ...notificationParams, userId: user.id }))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
  } catch (error) {
    return null;
  }
}
