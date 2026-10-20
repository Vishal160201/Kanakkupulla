import { CheckCircle2, PackageOpen, Settings, ShoppingBag } from "lucide-react";

export const STATUS_OPTIONS = [
  { value: "PENDING", label: "PENDING", icon: PackageOpen, text: "text-red-500", bg: "bg-red-50", border: "border-red-200", solidBg: "bg-red-500", shadow: "shadow-red-500/30", line: "bg-red-400", textLabel: "text-red-600" },
  { value: "PROCESSING", label: "IN PRODUCTION", icon: Settings, text: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", solidBg: "bg-amber-500", shadow: "shadow-amber-500/30", line: "bg-amber-400", textLabel: "text-amber-600" },
  { value: "READY", label: "READY FOR PICKUP", icon: ShoppingBag, text: "text-green-500", bg: "bg-green-50", border: "border-green-200", solidBg: "bg-green-500", shadow: "shadow-green-500/30", line: "bg-green-400", textLabel: "text-green-600" },
  { value: "DELIVERED", label: "DELIVERED", icon: CheckCircle2, text: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", solidBg: "bg-blue-500", shadow: "shadow-blue-500/30", line: "bg-blue-400", textLabel: "text-blue-600" },
];

export type StatusOption = (typeof STATUS_OPTIONS)[number];

export const PAYMENT_MODE_OPTIONS = [
  { label: "Cash", value: "CASH" },
  { label: "UPI", value: "UPI" },
  { label: "Card", value: "CARD" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
];

/** customData keys (normalised) that are shown elsewhere and must not be listed as extra fields. */
export const STANDARD_CUSTOM_KEYS = ["amount", "advance", "advanceamount", "dueamount", "paymentmode", "clientphone", "clientname", "duedate", "product", "quantity"];

/** True for customData values that are attachments (Drive files or inline data-URL images). */
export function isAttachmentValue(val: unknown): boolean {
  return (
    Boolean(typeof val === "object" && val !== null && (val as { driveFile?: unknown }).driveFile) ||
    (typeof val === "string" && val.startsWith("data:image"))
  );
}

/** "14:05" -> "02:05 PM"; any other value is returned unchanged. */
export function formatCustomFieldValue(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const timeMatch = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return val;
  const h24 = parseInt(timeMatch[1], 10);
  const m = timeMatch[2];
  const p = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, "0")}:${m} ${p}`;
}
