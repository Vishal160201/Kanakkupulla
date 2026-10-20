import type { GiftOrder } from "@/types/gifts";

export interface StatusStyle {
  label: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
}

/** Pill styling per ProductOrder.status (shared by the active and all-orders lists). */
export const STATUS_STYLE_MAP: Record<string, StatusStyle> = {
  PENDING: { label: "PENDING", dot: "bg-orange-500", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  PROCESSING: { label: "IN PRODUCTION", dot: "bg-slate-500", bg: "bg-slate-200", text: "text-slate-700", border: "border-slate-300" },
  READY: { label: "READY FOR PICKUP", dot: "bg-amber-600", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  DELIVERED: { label: "DELIVERED", dot: "bg-blue-300", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

export type PaymentStatus = "PAID" | "UNPAID" | "PARTIAL";

/** Total (from customData.amount), amount paid (INCOME transactions) and derived payment status. */
export function calculatePaymentInfo(order: GiftOrder) {
  const totalAmount = parseFloat(String(order.customData?.amount || '0'));
  const paidAmount = (order.transactions || [])
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  let pStatus: PaymentStatus = "UNPAID";
  if (paidAmount >= totalAmount && totalAmount > 0) pStatus = "PAID";
  else if (paidAmount > 0) pStatus = "PARTIAL";

  return { totalAmount, paidAmount, pStatus };
}

/** Order number, or "#ABC123" from the id when none was assigned. */
export const orderDisplayId = (order: Pick<GiftOrder, "id" | "orderNumber">) =>
  order.orderNumber || `#${order.id.slice(-6).toUpperCase()}`;
