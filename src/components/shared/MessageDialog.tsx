"use client";

import { useState } from "react";
import { toast } from "sonner";
import { InventoryDialog, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage } from "@/components/inventory/inventoryUtils";
import { formatPhone, normalizePhone, smsUrl, waChatUrl, type MessageLanguage } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export interface MessageOption<K extends string> {
  kind: K;
  label: string;
  icon: string;
}

const LANGUAGE_KEY = "kanakku.whatsappLanguage";

/** The language last picked on this device (a convenience; English when storage isn't available). */
function storedLanguage(): MessageLanguage {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "ta" ? "ta" : "en";
  } catch {
    return "en";
  }
}

/**
 * Click-to-chat: pick a ready-made message, edit it, and open WhatsApp with it typed in. The person
 * presses Send in WhatsApp; nothing is sent from Kanakkupulla. Remount (key) for a different person.
 */
export default function MessageDialog<K extends string>({
  name,
  phone: rawPhone,
  options,
  initialKind,
  fill,
  onSendSms,
  note,
  extras,
  onClose,
}: {
  name: string;
  phone: string | null | undefined;
  options: MessageOption<K>[];
  initialKind: K;
  /** The ready-made message `kind` in `language`, filled from live data */
  fill: (kind: K, language: MessageLanguage) => string;
  /** Sends through the shop's SMS gateway; without it, "Send SMS" opens the phone's Messages app */
  onSendSms?: (text: string) => Promise<void>;
  /** Shown under the message, e.g. what's missing from the templates */
  note?: React.ReactNode;
  /** Extra controls under the message (e.g. attaching an invoice); they can read and change the text */
  extras?: (api: { text: string; setText: (text: string) => void }) => React.ReactNode;
  onClose: () => void;
}) {
  const [language, setLanguage] = useState<MessageLanguage>(storedLanguage);
  const [kind, setKind] = useState<K | "custom">(initialKind);
  const [text, setText] = useState(() => fill(initialKind, language));
  const [sendingSms, setSendingSms] = useState(false);
  const phone = normalizePhone(rawPhone);
  const allOptions: MessageOption<K | "custom">[] = [...options, { kind: "custom", label: "Write your own", icon: "ph-pencil-simple" }];

  const chooseLanguage = (lang: MessageLanguage) => {
    setLanguage(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Remembering the choice is optional
    }
    if (kind !== "custom") setText(fill(kind, lang));
  };
  const choose = (k: K | "custom") => {
    setKind(k);
    setText(k === "custom" ? "" : fill(k, language));
  };
  const sendViaGateway = async () => {
    if (!onSendSms) return;
    setSendingSms(true);
    try {
      await onSendSms(text);
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
      title={`Message ${name}`}
      subtitle={phone ? formatPhone(phone) : rawPhone ? `"${rawPhone}" isn't a usable mobile number` : "No phone number saved"}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={copy} disabled={!text.trim()} className={secondaryButtonClass}>
            <i className="ph-bold ph-copy" aria-hidden="true" /> Copy
          </button>
          {!phone ? (
            <button type="button" disabled className={secondaryButtonClass}>
              <i className="ph-bold ph-chat-text" aria-hidden="true" /> Send SMS
            </button>
          ) : onSendSms ? (
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
          {allOptions.map((o) => (
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
        {extras?.({ text, setText })}
        {note && <p className="text-xs font-semibold text-slate-400">{note}</p>}
      </div>
    </InventoryDialog>
  );
}
