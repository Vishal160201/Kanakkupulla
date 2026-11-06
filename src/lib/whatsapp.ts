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

/** SMS has no formatting, so drop the *bold* markers WhatsApp uses. */
export const plainText = (text: string) => text.replace(/\*(.+?)\*/g, "$1");

/** sms: link that opens the phone's Messages app to `phone` with `text` typed in (bold markers removed). */
export function smsUrl(phone: string, text = ""): string {
  const body = plainText(text).trim();
  // "?&body=" is the form both Android and iOS accept
  return `sms:+${phone}${body ? `?&body=${encodeURIComponent(body)}` : ""}`;
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

A gentle reminder: *{due}* is pending for your {service}.

Plan: {plan}
VC number: {vc}
Pay by UPI: {upi}
Help: {phone}

Thank you,
{shop}`,
    thanks: `Hi {customer},

We received *{paid}* for your {service}. Thank you!

Plan: {plan}
VC number: {vc}
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

உங்கள் {service} *{due}* இன்னும் செலுத்தப்படவில்லை. தயவுசெய்து விரைவில் செலுத்தவும்.

திட்டம்: {plan}
VC எண்: {vc}
UPI மூலம் செலுத்த: {upi}
உதவிக்கு: {phone}

நன்றி,
{shop}`,
    thanks: `வணக்கம் {customer},

உங்கள் {service} *{paid}* பெற்றுக்கொண்டோம். நன்றி!

திட்டம்: {plan}
VC எண்: {vc}
*{expiry}* வரை செயலில் இருக்கும்

{shop}`,
  },
};

/** What the money is for, as the {service} placeholder: internet renewal or cable TV bill (Tamil takes the "for" ending). */
export const SERVICE_TEXT: Record<"internet" | "cable", Record<MessageLanguage, string>> = {
  internet: { en: "internet renewal", ta: "இணையப் புதுப்பிப்புக்கான" },
  cable: { en: "cable TV bill", ta: "கேபிள் டிவி கட்டணத்துக்கான" },
};

/** "06 Nov 2026" / "06 நவ., 2026" for messages in that language. */
export function messageDate(iso: string, language: MessageLanguage): string {
  return new Date(iso).toLocaleDateString(language === "ta" ? "ta-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export type StudioMessageKind = "bookingConfirmed" | "shootReminder" | "paymentDue" | "thanks" | "galleryReady" | "albumReady";

// Messages to a studio client about their booking; same rules as the cable ones above.
export const STUDIO_TEMPLATES: Record<MessageLanguage, Record<StudioMessageKind, string>> = {
  en: {
    bookingConfirmed: `Hi {customer},

Your *{category}* shoot with {shop} is confirmed.

Date: *{date}*
Time: {time}
Venue: {venue}
Package: {package}
Advance received: {paid}
Balance: {due}

Thank you,
{shop}
{phone}`,
    shootReminder: `Hi {customer},

A reminder that your *{category}* shoot is coming up.

Date: *{date}*
Time: {time}
Venue: {venue}

See you there!
{shop}
{phone}`,
    paymentDue: `Hi {customer},

A gentle reminder: *{due}* is pending for your {category} shoot.

Shoot date: {date}
Pay by UPI: {upi}
Help: {phone}

Thank you,
{shop}`,
    thanks: `Hi {customer},

We received *{paid}* for your {category} shoot. Thank you!

Balance: {due}

{shop}`,
    galleryReady: `Hi {customer},

Your {category} photos are ready!

View them here: {gallery}

Thank you for choosing us,
{shop}`,
    albumReady: `Hi {customer},

Good news: your {category} album is ready. Please let us know a convenient time to collect it.

Balance: {due}
Help: {phone}

Thank you,
{shop}`,
  },
  ta: {
    bookingConfirmed: `வணக்கம் {customer},

{shop} உடன் உங்கள் *{category}* படப்பிடிப்பு உறுதி செய்யப்பட்டது.

தேதி: *{date}*
நேரம்: {time}
இடம்: {venue}
பேக்கேஜ்: {package}
பெற்ற முன்பணம்: {paid}
மீதித் தொகை: {due}

நன்றி,
{shop}
{phone}`,
    shootReminder: `வணக்கம் {customer},

உங்கள் *{category}* படப்பிடிப்பு விரைவில் நடைபெற உள்ளது என்பதை நினைவூட்டுகிறோம்.

தேதி: *{date}*
நேரம்: {time}
இடம்: {venue}

சந்திப்போம்!
{shop}
{phone}`,
    paymentDue: `வணக்கம் {customer},

உங்கள் {category} படப்பிடிப்புக்கான *{due}* இன்னும் செலுத்தப்படவில்லை. தயவுசெய்து விரைவில் செலுத்தவும்.

படப்பிடிப்பு தேதி: {date}
UPI மூலம் செலுத்த: {upi}
உதவிக்கு: {phone}

நன்றி,
{shop}`,
    thanks: `வணக்கம் {customer},

உங்கள் {category} படப்பிடிப்புக்கான *{paid}* பெற்றுக்கொண்டோம். நன்றி!

மீதித் தொகை: {due}

{shop}`,
    galleryReady: `வணக்கம் {customer},

உங்கள் {category} புகைப்படங்கள் தயாராக உள்ளன!

இங்கே பார்க்கவும்: {gallery}

எங்களைத் தேர்ந்தெடுத்ததற்கு நன்றி,
{shop}`,
    albumReady: `வணக்கம் {customer},

உங்கள் {category} ஆல்பம் தயாராக உள்ளது. பெற்றுக்கொள்ள வசதியான நேரத்தைத் தெரிவிக்கவும்.

மீதித் தொகை: {due}
உதவிக்கு: {phone}

நன்றி,
{shop}`,
  },
};

export type OrderMessageKind = "orderConfirmed" | "readyForPickup" | "paymentDue" | "thanks" | "delivered";

// Messages to a gift / frame order's client; same rules as the cable and studio ones above.
export const ORDER_TEMPLATES: Record<MessageLanguage, Record<OrderMessageKind, string>> = {
  en: {
    orderConfirmed: `Hi {customer},

Your order with {shop} is confirmed.

Order: {orderNo}
Item: {product}
Quantity: {qty}
Ready by: *{delivery}*
Total: {total}
Advance received: {paid}
Balance: {due}

Thank you,
{shop}
{phone}`,
    readyForPickup: `Hi {customer},

Good news: your *{product}* is ready. Please collect it at your convenience.

Order: {orderNo}
Balance: *{due}*
Pay by UPI: {upi}
Help: {phone}

Thank you,
{shop}`,
    paymentDue: `Hi {customer},

A gentle reminder: *{due}* is pending for your order of {product}.

Order: {orderNo}
Pay by UPI: {upi}
Help: {phone}

Thank you,
{shop}`,
    thanks: `Hi {customer},

We received *{paid}* for your order of {product}. Thank you!

Order: {orderNo}
Balance: {due}

{shop}`,
    delivered: `Hi {customer},

Your {product} has been delivered. We hope you love it!

Order: {orderNo}

Thank you for choosing us,
{shop}`,
  },
  ta: {
    orderConfirmed: `வணக்கம் {customer},

{shop} இல் உங்கள் ஆர்டர் உறுதி செய்யப்பட்டது.

ஆர்டர்: {orderNo}
பொருள்: {product}
எண்ணிக்கை: {qty}
தயாராகும் நாள்: *{delivery}*
மொத்தம்: {total}
பெற்ற முன்பணம்: {paid}
மீதித் தொகை: {due}

நன்றி,
{shop}
{phone}`,
    readyForPickup: `வணக்கம் {customer},

உங்கள் *{product}* தயாராக உள்ளது. வசதியான நேரத்தில் பெற்றுக்கொள்ளவும்.

ஆர்டர்: {orderNo}
மீதித் தொகை: *{due}*
UPI மூலம் செலுத்த: {upi}
உதவிக்கு: {phone}

நன்றி,
{shop}`,
    paymentDue: `வணக்கம் {customer},

உங்கள் {product} ஆர்டருக்கான *{due}* இன்னும் செலுத்தப்படவில்லை. தயவுசெய்து விரைவில் செலுத்தவும்.

ஆர்டர்: {orderNo}
UPI மூலம் செலுத்த: {upi}
உதவிக்கு: {phone}

நன்றி,
{shop}`,
    thanks: `வணக்கம் {customer},

உங்கள் {product} ஆர்டருக்கான *{paid}* பெற்றுக்கொண்டோம். நன்றி!

ஆர்டர்: {orderNo}
மீதித் தொகை: {due}

{shop}`,
    delivered: `வணக்கம் {customer},

உங்கள் {product} வழங்கப்பட்டது. உங்களுக்குப் பிடிக்கும் என நம்புகிறோம்!

ஆர்டர்: {orderNo}

எங்களைத் தேர்ந்தெடுத்ததற்கு நன்றி,
{shop}`,
  },
};
