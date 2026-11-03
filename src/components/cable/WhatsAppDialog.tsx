"use client";

import { useState } from "react";
import { toast } from "sonner";
import { InventoryDialog, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatINR, sendJson } from "@/components/inventory/inventoryUtils";
import { CABLE_TEMPLATES, SERVICE_TEXT, formatPhone, messageDate, normalizePhone, planLabel, renderTemplate, smsUrl, waChatUrl, withoutMissing, type CableMessageKind, type MessageLanguage } from "@/lib/whatsapp";
import type { CableShopInfo } from "@/types/cable";
import { cn } from "@/lib/utils";

export interface WhatsAppTarget {
  /** Subscriber id, for sending SMS server-side through the gateway */
  id: string;
  /** TIC_FIBER (internet) or TCCL (cable TV) */
  provider: string;
  vcNumber?: string | null;
  name: string;
  phone: string | null;
  plan: string | null;
  expiresAt: string | null;
  due: number;
  /** Set right after a payment, for the thank-you message */
  paid?: number;
}

const OPTIONS: { kind: CableMessageKind | "custom"; label: string; icon: string }[] = [
  { kind: "renewalReminder", label: "Renewal reminder", icon: "ph-hourglass-medium" },
  { kind: "expired", label: "Plan expired", icon: "ph-calendar-x" },
  { kind: "paymentDue", label: "Payment pending", icon: "ph-currency-inr" },
  { kind: "thanks", label: "Payment received", icon: "ph-check-circle" },
  { kind: "custom", label: "Write your own", icon: "ph-pencil-simple" },
];

const LANGUAGE_KEY = "kanakku.whatsappLanguage";

/** The language last picked on this device (a convenience; English when storage isn't available). */
function storedLanguage(): MessageLanguage {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "ta" ? "ta" : "en";
  } catch {
    return "en";
  }
}

/** Default message for where the subscriber is: just paid → thanks; expired → expired; owes → pending; else reminder. */
function defaultKind(t: WhatsAppTarget): CableMessageKind {
  if (t.paid) return "thanks";
  if (t.provider === "TCCL") return "paymentDue";
  if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) return "expired";
  if (t.due > 0) return "paymentDue";
  return "renewalReminder";
}

/**
 * Click-to-chat: pick a ready-made message, edit it, and open WhatsApp with it typed in. The person
 * presses Send in WhatsApp; nothing is sent from Kanakkupulla.
 */
export default function WhatsAppDialog({ target, shop, onClose }: { target: WhatsAppTarget; shop: CableShopInfo; onClose: () => void }) {
  const [language, setLanguage] = useState<MessageLanguage>(storedLanguage);
  const [sendingSms, setSendingSms] = useState(false);
  const isCable = target.provider === "TCCL";
  // Cable TV has no plan expiry, so only the money messages apply
  const options = isCable ? OPTIONS.filter((o) => o.kind !== "renewalReminder" && o.kind !== "expired") : OPTIONS;
  const varsFor = (lang: MessageLanguage) => ({
    customer: target.name,
    provider: isCable ? "TCCL" : "TIC Fiber",
    service: SERVICE_TEXT[isCable ? "cable" : "internet"][lang],
    vc: target.vcNumber ?? "",
    plan: planLabel(target.plan),
    expiry: target.expiresAt ? messageDate(target.expiresAt, lang) : "",
    due: target.due > 0 ? formatINR(target.due, { decimals: false }) : "",
    paid: target.paid ? formatINR(target.paid, { decimals: false }) : "",
    upi: shop.upiId ?? "",
    phone: shop.contactPhone ?? "",
    shop: shop.name,
  });
  const fill = (k: CableMessageKind, lang = language) => {
    const vars = varsFor(lang);
    return renderTemplate(withoutMissing(CABLE_TEMPLATES[lang][k], vars), vars);
  };
  const [kind, setKind] = useState<CableMessageKind | "custom">(defaultKind(target));
  const [text, setText] = useState(() => fill(defaultKind(target)));
  // Opening a different subscriber reuses this dialog; reset the message to the new person (render-time reset, no effect)
  const [lastId, setLastId] = useState(target.id);
  if (lastId !== target.id) {
    setLastId(target.id);
    const k = defaultKind(target);
    setKind(k);
    setText(fill(k));
  }

  const chooseLanguage = (lang: MessageLanguage) => {
    setLanguage(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Remembering the choice is optional
    }
    if (kind !== "custom") setText(fill(kind, lang));
  };
  const phone = normalizePhone(target.phone);

  const choose = (k: CableMessageKind | "custom") => {
    setKind(k);
    setText(k === "custom" ? "" : fill(k));
  };
  const sendViaGateway = async () => {
    setSendingSms(true);
    try {
      await sendJson(`/api/cable/subscribers/${encodeURIComponent(target.id)}/sms`, "POST", { text });
      toast.success(`SMS sent to ${target.name}`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSendingSms(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
    } catch {
      toast.error("Couldn't copy the message");
    }
  };

  return (
    <InventoryDialog
      open
      onClose={onClose}
      eyebrow="Message"
      title={`Message ${target.name}`}
      subtitle={phone ? formatPhone(phone) : target.phone ? `"${target.phone}" isn't a usable mobile number` : "No phone number on this subscriber"}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={copy} disabled={!text.trim()} className={secondaryButtonClass}>
            <i className="ph-bold ph-copy" aria-hidden="true" /> Copy
          </button>
          {!phone ? (
            <button type="button" disabled className={secondaryButtonClass}>
              <i className="ph-bold ph-chat-text" aria-hidden="true" /> Send SMS
            </button>
          ) : shop.smsConfigured ? (
            <button type="button" onClick={sendViaGateway} disabled={!text.trim() || sendingSms} className={secondaryButtonClass}>
              <i className={cn("ph-bold", sendingSms ? "ph-circle-notch animate-spin" : "ph-chat-text")} aria-hidden="true" /> {sendingSms ? "Sending…" : "Send SMS"}
            </button>
          ) : (
            <a href={smsUrl(phone, text)} onClick={onClose} className={cn(secondaryButtonClass, !text.trim() && "pointer-events-none opacity-50")}>
              <i className="ph-bold ph-chat-text" aria-hidden="true" /> Send SMS
            </a>
          )}
          {phone ? (
            <a
              href={waChatUrl(phone, text)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={cn(primaryButtonClass, "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20", !text.trim() && "pointer-events-none opacity-50")}
            >
              <i className="ph-fill ph-whatsapp-logo" aria-hidden="true" /> Open WhatsApp
            </a>
          ) : (
            <button type="button" disabled className={primaryButtonClass}>
              <i className="ph-fill ph-whatsapp-logo" aria-hidden="true" /> Open WhatsApp
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:inline-grid bg-slate-50 border border-slate-200 rounded-xl p-1" role="radiogroup" aria-label="Message language">
          {(
            [
              ["en", "English"],
              ["ta", "தமிழ்"],
            ] as const
          ).map(([lang, label]) => (
            <button
              key={lang}
              type="button"
              role="radio"
              aria-checked={language === lang}
              onClick={() => chooseLanguage(lang)}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-bold", language === lang ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Message">
          {options.map((o) => (
            <button
              key={o.kind}
              type="button"
              role="radio"
              aria-checked={kind === o.kind}
              onClick={() => choose(o.kind)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors",
                kind === o.kind ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:border-emerald-200"
              )}
            >
              <i className={`ph-bold ${o.icon} text-base`} aria-hidden="true" />
              {o.label}
            </button>
          ))}
        </div>
        <textarea
          rows={11}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Type the message…"
          aria-label="Message"
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        {(!shop.upiId || !shop.contactPhone) && (
          <p className="text-xs font-semibold text-slate-400">Add your UPI ID and phone in Cable settings to include them in messages.</p>
        )}
      </div>
    </InventoryDialog>
  );
}
