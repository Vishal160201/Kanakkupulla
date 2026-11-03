// WhatsApp click-to-chat (wa.me): opens the chat in the shop's own WhatsApp with the message typed in,
// ready to send. Nothing is sent from the server. Same approach as the Add designer site.

/** Country code added to 10-digit local numbers. */
export const DEFAULT_COUNTRY_CODE = "91";

/** International digits with no "+" (e.g. 917373787172); null when unusable. */
export function normalizePhone(raw: unknown, defaultCountryCode = DEFAULT_COUNTRY_CODE): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `${defaultCountryCode}${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

/** "917373787172" → "+91 73737 87172". */
export function formatPhone(digits: string): string {
  return digits.startsWith("91") && digits.length === 12 ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`;
}

export function waChatUrl(phone: string, text = ""): string {
  const body = text.trim();
  return `https://wa.me/${phone}${body ? `?text=${encodeURIComponent(body)}` : ""}`;
}

/** Fills {placeholders}; unknown ones stay as typed so a typo is visible before sending. */
export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template
    .replace(/\{([a-zA-Z]+)\}/g, (match, key: string) => {
      const v = vars[key];
      return v === undefined || v === null || v === "" ? (key in vars ? "" : match) : String(v);
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === "";

/** The template without the lines whose value the shop / subscriber doesn't have (no UPI ID, no plan…). */
export function withoutMissing(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template
    .split("\n")
    .filter((line) => ![...line.matchAll(/\{([a-zA-Z]+)\}/g)].some(([, key]) => key in vars && isEmpty(vars[key])))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Plan tier words written in normal case; other codes (ADP, SNKL…) stay as they are. */
const TIERS = new Set(["NEW", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "SPECIAL", "OFFER"]);

/** "TIC_GOLD_75MBPS_UL_499_12M" → "Gold 75 Mbps Unlimited · 12 months" (the price is shown separately). */
export function planLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  let months = "";
  const words: string[] = [];
  for (const part of raw.replace(/^TIC_/i, "").split("_")) {
    const speed = part.match(/^(\d+)mbps$/i);
    const data = part.match(/^(\d+)gb$/i);
    const validity = part.match(/^(\d+)M(?:\+(\d+)M)?$/);
    if (speed) words.push(`${speed[1]} Mbps`);
    else if (data) words.push(`${data[1]} GB`);
    else if (/^UL$/i.test(part)) words.push("Unlimited");
    else if (validity && words.length > 0) months = validity[2] ? `${validity[1]}+${validity[2]} months` : `${validity[1]} month${validity[1] === "1" ? "" : "s"}`;
    else if (/^\d+$/.test(part)) continue; // the plan's price
    else words.push(TIERS.has(part.toUpperCase()) ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part);
  }
  return [words.join(" "), months].filter(Boolean).join(" · ") || raw;
}

export type CableMessageKind = "renewalReminder" | "expired" | "paymentDue" | "thanks";
export type MessageLanguage = "en" | "ta";

// WhatsApp shows *text* in bold. One detail per line; lines with a missing value are dropped.
export const CABLE_TEMPLATES: Record<MessageLanguage, Record<CableMessageKind, string>> = {
  en: {
    renewalReminder: `Hi {customer},

Your {provider} internet plan expires on *{expiry}*. Please renew to keep your connection running.

Plan: {plan}
Amount: *{due}*
Pay by UPI: {upi}
Help: {phone}

Thank you,
{shop}`,
    expired: `Hi {customer},

Your {provider} internet plan expired on *{expiry}*. Renew today to get your connection back.

Plan: {plan}
Amount: *{due}*
Pay by UPI: {upi}
Help: {phone}

Thank you,
{shop}`,
    paymentDue: `Hi {customer},

A gentle reminder: *{due}* is pending for your internet renewal.

Plan: {plan}
Pay by UPI: {upi}
Help: {phone}

Thank you,
{shop}`,
    thanks: `Hi {customer},

We received *{paid}* for your internet renewal. Thank you!

Plan: {plan}
Active till: *{expiry}*

{shop}`,
  },
  ta: {
    renewalReminder: `வணக்கம் {customer},

உங்கள் {provider} இணையத் திட்டம் *{expiry}* அன்று முடிவடைகிறது. இணைப்பு தொடர, தயவுசெய்து புதுப்பிக்கவும்.

திட்டம்: {plan}
தொகை: *{due}*
UPI மூலம் செலுத்த: {upi}
உதவிக்கு: {phone}

நன்றி,
{shop}`,
    expired: `வணக்கம் {customer},

உங்கள் {provider} இணையத் திட்டம் *{expiry}* அன்று முடிவடைந்தது. இணைப்பை மீண்டும் பெற இன்றே புதுப்பிக்கவும்.

திட்டம்: {plan}
தொகை: *{due}*
UPI மூலம் செலுத்த: {upi}
உதவிக்கு: {phone}

நன்றி,
{shop}`,
    paymentDue: `வணக்கம் {customer},

உங்கள் இணையப் புதுப்பிப்புக்கான *{due}* இன்னும் செலுத்தப்படவில்லை. தயவுசெய்து விரைவில் செலுத்தவும்.

திட்டம்: {plan}
UPI மூலம் செலுத்த: {upi}
உதவிக்கு: {phone}

நன்றி,
{shop}`,
    thanks: `வணக்கம் {customer},

உங்கள் இணையப் புதுப்பிப்புக்கான *{paid}* பெற்றுக்கொண்டோம். நன்றி!

திட்டம்: {plan}
*{expiry}* வரை செயலில் இருக்கும்

{shop}`,
  },
};

/** "06 Nov 2026" / "06 நவ., 2026" for messages in that language. */
export function messageDate(iso: string, language: MessageLanguage): string {
  return new Date(iso).toLocaleDateString(language === "ta" ? "ta-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
