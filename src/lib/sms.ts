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

// Sending SMS through httpSMS (https://httpsms.com): the operator's own Android phone, running the
// httpSMS app, sends the message via its SIM. We POST to the API with the shop's key; the sender is
// the shop's own number, so no DLT/gateway registration is needed.

const HTTPSMS_URL = "https://api.httpsms.com/v1/messages/send";

export class SmsError extends ShopError {}

export interface SmsGateway {
  apiKey: string;
  from: string;
}

/** The shop's httpSMS settings, or an error when it isn't set up. */
export async function getShopGateway(shopId: string): Promise<SmsGateway> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { smsApiKey: true, smsFrom: true } });
  const from = normalizePhone(shop?.smsFrom);
  if (!shop?.smsApiKey || !from) {
    throw new SmsError("SMS isn't set up. Add your httpSMS API key and phone number in Settings.", 422);
  }
  return { apiKey: shop.smsApiKey, from: `+${from}` };
}

/** Sends one SMS via httpSMS. Throws SmsError on a bad number or an API failure. */
export async function sendSms(gateway: SmsGateway, to: string, content: string, requestId?: string) {
  const phone = normalizePhone(to);
  if (!phone) throw new SmsError("No usable mobile number for this subscriber.", 422);
  let res: Response;
  try {
    res = await fetch(HTTPSMS_URL, {
      method: "POST",
      headers: { "x-api-key": gateway.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: gateway.from, to: `+${phone}`, content: plainText(content), ...(requestId ? { request_id: requestId } : {}) }),
    });
  } catch {
    throw new SmsError("Couldn't reach httpSMS. Check the phone's internet and try again.", 502);
  }
  if (!res.ok) {
    // Surface httpSMS's own reason so a bad key vs an unregistered number is clear
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string; data?: unknown };
      detail = body.message || (typeof body.data === "string" ? body.data : "");
    } catch {
      detail = (await res.text().catch(() => "")).slice(0, 140);
    }
    const suffix = detail ? ` (${detail})` : "";
    if (res.status === 401) throw new SmsError(`httpSMS rejected the API key${suffix}. Copy it again from httpsms.com/settings into Settings.`, 502);
    throw new SmsError(`httpSMS couldn't send the SMS: error ${res.status}${suffix}.`, 502);
  }
}

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
