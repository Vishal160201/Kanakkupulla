"use client";

import { toast } from "sonner";
import MessageDialog, { type MessageOption } from "@/components/shared/MessageDialog";
import { formatINR, sendJson } from "@/components/inventory/inventoryUtils";
import { CABLE_TEMPLATES, SERVICE_TEXT, messageDate, planLabel, renderTemplate, withoutMissing, type CableMessageKind, type MessageLanguage } from "@/lib/whatsapp";
import type { CableShopInfo } from "@/types/cable";

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

const OPTIONS: MessageOption<CableMessageKind>[] = [
  { kind: "renewalReminder", label: "Renewal reminder", icon: "ph-hourglass-medium" },
  { kind: "expired", label: "Plan expired", icon: "ph-calendar-x" },
  { kind: "paymentDue", label: "Payment pending", icon: "ph-currency-inr" },
  { kind: "thanks", label: "Payment received", icon: "ph-check-circle" },
];

/** Default message for where the subscriber is: just paid → thanks; expired → expired; owes → pending; else reminder. */
function defaultKind(t: WhatsAppTarget): CableMessageKind {
  if (t.paid) return "thanks";
  if (t.provider === "TCCL") return "paymentDue";
  if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) return "expired";
  if (t.due > 0) return "paymentDue";
  return "renewalReminder";
}

/** WhatsApp / SMS a cable or internet subscriber. Callers key it by subscriber so it resets per person. */
export default function WhatsAppDialog({ target, shop, onClose }: { target: WhatsAppTarget; shop: CableShopInfo; onClose: () => void }) {
  const isCable = target.provider === "TCCL";
  // Cable TV has no plan expiry, so only the money messages apply
  const options = isCable ? OPTIONS.filter((o) => o.kind !== "renewalReminder" && o.kind !== "expired") : OPTIONS;
  const fill = (k: CableMessageKind, lang: MessageLanguage) => {
    const vars = {
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
    };
    return renderTemplate(withoutMissing(CABLE_TEMPLATES[lang][k], vars), vars);
  };
  const sendSms = async (text: string) => {
    await sendJson(`/api/cable/subscribers/${encodeURIComponent(target.id)}/sms`, "POST", { text });
    toast.success(`SMS queued for ${target.name}`, { description: "Your phone will send it shortly." });
  };

  return (
    <MessageDialog
      name={target.name}
      phone={target.phone}
      options={options}
      initialKind={defaultKind(target)}
      fill={fill}
      onSendSms={shop.smsConfigured ? sendSms : undefined}
      note={(!shop.upiId || !shop.contactPhone) && "Add your UPI ID and phone in Cable settings to include them in messages."}
      onClose={onClose}
    />
  );
}
