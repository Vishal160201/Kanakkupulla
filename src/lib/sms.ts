import { createHash, randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { ShopError } from "@/lib/shops";
import {
  CABLE_TEMPLATES,
  SERVICE_TEXT,
  messageDate,
  normalizePhone,
  planLabel,
  plainText,
  renderTemplate,
  withoutMissing,
  type CableMessageKind,
  type MessageLanguage,
} from "@/lib/whatsapp";

// Our own free SMS gateway: messages are queued in OutboundSms, and the shop's Kanakkupulla SMS
// sender Android app polls its outbox and sends each one through the phone's SIM. No third party.

export class SmsError extends ShopError {}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const newDeviceToken = () => `kst_${randomBytes(24).toString("base64url")}`;
export const hashDeviceToken = (token: string) => sha256(token);

/**
 * The cable shop a sender-app token belongs to. One token = one phone: the first device to poll is
 * bound to it, and any other device is refused until the shop re-pairs (which clears the binding).
 */
export async function shopForDevice(token: string, deviceId: string | null) {
  const shop = await prisma.shop.findUnique({ where: { smsDeviceTokenHash: sha256(token) }, select: { id: true, type: true, isArchived: true, smsDeviceId: true } });
  if (!shop || shop.type !== "CABLE" || shop.isArchived) return { error: "token" as const };
  if (!deviceId) return { error: "device" as const };
  if (shop.smsDeviceId === deviceId) return { shop };
  if (shop.smsDeviceId) return { error: "device" as const };
  // Bind only if still unbound, so two phones polling at once can't both win
  const bound = await prisma.shop.updateMany({ where: { id: shop.id, smsDeviceId: null }, data: { smsDeviceId: deviceId } });
  if (bound.count === 1) return { shop };
  const now = await prisma.shop.findUnique({ where: { id: shop.id }, select: { smsDeviceId: true } });
  return now?.smsDeviceId === deviceId ? { shop } : { error: "device" as const };
}

/** The shop's latest outbox messages, newest first, for the sender app's queue view. */
export function recentOutbox(shopId: string) {
  return prisma.outboundSms.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, to: true, content: true, status: true, reason: true, createdAt: true },
  });
}

/** Queues one SMS for the shop's sender app. Throws when the phone isn't paired or the number is unusable. */
export async function enqueueSms(shopId: string, to: string, content: string, meta: { subscriberId?: string; createdById?: string } = {}) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { smsDeviceTokenHash: true } });
  if (!shop?.smsDeviceTokenHash) throw new SmsError("No phone is paired for SMS. Pair the sender app in Settings first.", 422);
  const phone = normalizePhone(to);
  if (!phone) throw new SmsError("No usable mobile number for this subscriber.", 422);
  return prisma.outboundSms.create({
    data: { shopId, to: `+${phone}`, content: plainText(content), subscriberId: meta.subscriberId ?? null, createdById: meta.createdById ?? null },
    select: { id: true },
  });
}

/** Messages left in a "sending" claim longer than this are assumed dropped and re-queued. */
const CLAIM_TIMEOUT_MS = 5 * 60_000;
const CLAIM_BATCH = 20;

/**
 * The sender app's poll: re-queues stale claims, then atomically claims up to `CLAIM_BATCH` pending
 * messages (pending → sending) so a second poll can't grab the same ones, and returns them to send.
 */
export async function claimOutbox(shopId: string) {
  const now = new Date();
  await prisma.shop.update({ where: { id: shopId }, data: { smsDeviceSeenAt: now } });
  await prisma.outboundSms.updateMany({
    where: { shopId, status: "sending", updatedAt: { lt: new Date(now.getTime() - CLAIM_TIMEOUT_MS) } },
    data: { status: "pending" },
  });
  // Claim without a transaction races only with another device on the same shop (not expected); the
  // timeout re-queue above makes any lost claim self-healing.
  const pending = await prisma.outboundSms.findMany({ where: { shopId, status: "pending" }, orderBy: { createdAt: "asc" }, take: CLAIM_BATCH, select: { id: true, to: true, content: true } });
  if (pending.length === 0) return [];
  await prisma.outboundSms.updateMany({ where: { id: { in: pending.map((m) => m.id) } }, data: { status: "sending", attempts: { increment: 1 } } });
  return pending;
}

/** The sender app's report for one message. */
export async function reportOutbox(shopId: string, id: string, ok: boolean, reason?: string) {
  await prisma.outboundSms.updateMany({ where: { id, shopId }, data: { status: ok ? "sent" : "failed", reason: ok ? null : (reason ?? "failed").slice(0, 200) } });
}

// --- Reminder message building (shared by the Send reminders button and the daily cron) ---

export interface ReminderSubscriber {
  name: string;
  provider: string;
  plan: string | null;
  vcNumber: string | null;
  expiresAt: string | Date | null;
  phone: string | null;
  due: number;
}

export interface ReminderShop {
  name: string;
  upiId: string | null;
  contactPhone: string | null;
}

const iso = (d: string | Date) => (d instanceof Date ? d.toISOString() : d);

/** The reminder a subscriber should get, or null when there's nothing to remind them about. */
export function reminderMessage(sub: ReminderSubscriber, shop: ReminderShop, language: MessageLanguage): string | null {
  const isCable = sub.provider === "TCCL";
  let kind: CableMessageKind;
  if (isCable) {
    if (sub.due <= 0) return null; // cable has no expiry; only dues are worth a reminder
    kind = "paymentDue";
  } else if (sub.expiresAt && new Date(iso(sub.expiresAt)).getTime() < Date.now()) {
    kind = "expired";
  } else if (sub.due > 0) {
    kind = "paymentDue";
  } else {
    kind = "renewalReminder";
  }
  const vars = {
    customer: sub.name,
    provider: isCable ? "TCCL" : "TIC Fiber",
    service: SERVICE_TEXT[isCable ? "cable" : "internet"][language],
    plan: planLabel(sub.plan),
    vc: sub.vcNumber ?? "",
    expiry: sub.expiresAt ? messageDate(iso(sub.expiresAt), language) : "",
    due: sub.due > 0 ? `₹${sub.due.toLocaleString("en-IN")}` : "",
    upi: shop.upiId ?? "",
    phone: shop.contactPhone ?? "",
    shop: shop.name,
  };
  return plainText(renderTemplate(withoutMissing(CABLE_TEMPLATES[language][kind], vars), vars));
}

/** Days ahead within which an internet plan counts as "due a reminder". */
export const REMINDER_SOON_DAYS = 7;

/** Whether a subscriber is worth an automatic reminder (expiring soon / expired / owing). */
export function needsReminder(sub: ReminderSubscriber, now = Date.now()): boolean {
  if (sub.provider === "TCCL") return sub.due > 0;
  if (sub.due > 0) return true;
  if (!sub.expiresAt) return false;
  const days = (new Date(iso(sub.expiresAt)).getTime() - now) / 86_400_000;
  return days < REMINDER_SOON_DAYS;
}
