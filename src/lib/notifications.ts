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

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  link?: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pushSubscriptions: true },
    });

    if (!user) return null;

    // 1. Create in Database
    const notification = await prisma.notification.create({
      data: { userId, title, message, type, link },
    });

    // 2. Send Web Push
    if (user.pushNotifications && user.pushSubscriptions.length > 0) {
      const payload = JSON.stringify({
        title,
        body: message,
        url: link || "/",
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
            console.error("Web push error:", e);
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
            ${link ? `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${link}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Details</a>` : ''}
          </div>`
        });
      } catch (e) {
        console.error("Email send error:", e);
      }
    }

    // 4. Send WhatsApp
    if (user.phone) {
       const cleanPhone = user.phone.replace(/[^0-9]/g, '');
       if (cleanPhone.length >= 10) {
         let prefix = '';
         if (title.includes('New Booking')) prefix = '🆕 *New Booking Alert*';
         else if (title.includes('Booking Status Changed')) prefix = '🔄 *Status Update*';
         else prefix = '🔔 *Moondot Notification*';

         let text = `${prefix}\n\n${message}`;
         if (link) {
            text += `\n\nView details: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${link}`;
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
           console.error("Failed to send WhatsApp via bot server:", e);
         }
       }
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

export async function broadcastNotification(
  title: string,
  message: string,
  type: string,
  link?: string,
  skipUserId?: string | null
) {
  try {
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    const results = await Promise.allSettled(
      users
        .filter(user => !(skipUserId && user.id === skipUserId))
        .map(user => createNotification(user.id, title, message, type, link))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
  } catch (error) {
    console.error("Failed to broadcast notification:", error);
    return null;
  }
}
