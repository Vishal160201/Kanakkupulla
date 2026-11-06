"use client";

import MessageDialog, { type MessageOption } from "@/components/shared/MessageDialog";
import InvoiceAttachment from "@/components/shared/InvoiceAttachment";
import { formatINR } from "@/components/inventory/inventoryUtils";
import { STUDIO_DETAILS } from "@/lib/constants";
import { ORDER_TEMPLATES, messageDate, renderTemplate, withoutMissing, type MessageLanguage, type OrderMessageKind } from "@/lib/whatsapp";
import type { GiftOrder } from "@/types/gifts";

const OPTIONS: MessageOption<OrderMessageKind>[] = [
  { kind: "orderConfirmed", label: "Order confirmed", icon: "ph-check-square" },
  { kind: "readyForPickup", label: "Ready for pickup", icon: "ph-package" },
  { kind: "paymentDue", label: "Payment pending", icon: "ph-currency-inr" },
  { kind: "thanks", label: "Payment received", icon: "ph-check-circle" },
  { kind: "delivered", label: "Delivered", icon: "ph-gift" },
];

/** Default message for where the order is: ready → pickup; delivered → owed or thanks; overdue → payment; else confirmed. */
function defaultKind(order: GiftOrder, due: number): OrderMessageKind {
  if (order.status === "READY") return "readyForPickup";
  if (order.status === "DELIVERED") return due > 0 ? "paymentDue" : "delivered";
  if (due > 0 && order.dueDate && new Date(order.dueDate).getTime() < Date.now()) return "paymentDue";
  return "orderConfirmed";
}

/** WhatsApp / SMS the order's client from ready-made order messages, with the order invoice attached. */
export default function OrderWhatsAppDialog({
  order,
  totals,
  studio,
  onClose,
}: {
  order: GiftOrder;
  /** The order screen's own figures, so the message agrees with it */
  totals: { totalAmount: number; collectedAmount: number; discountAmountValue: number; dueAmount: number };
  studio?: { name: string; phone: string; upiId: string };
  onClose: () => void;
}) {
  const shop = studio ?? { name: STUDIO_DETAILS.name, phone: STUDIO_DETAILS.phone, upiId: STUDIO_DETAILS.upiId };
  const orderNo = (order.orderNumber ?? `MDorder-${order.id.slice(-6).toUpperCase()}`).replace(/^#/, "");
  const id = encodeURIComponent(order.id);
  const total = Math.max(0, totals.totalAmount - totals.discountAmountValue);

  const fill = (k: OrderMessageKind, lang: MessageLanguage) => {
    const vars = {
      customer: order.clientName,
      product: order.product?.name ?? "",
      qty: order.quantity > 1 ? order.quantity : "",
      orderNo,
      delivery: order.dueDate ? messageDate(order.dueDate, lang) : "",
      total: total > 0 ? formatINR(total, { decimals: false }) : "",
      paid: totals.collectedAmount > 0 ? formatINR(totals.collectedAmount, { decimals: false }) : "",
      due: totals.dueAmount > 0 ? formatINR(totals.dueAmount, { decimals: false }) : "",
      upi: shop.upiId,
      phone: shop.phone,
      shop: shop.name,
    };
    return renderTemplate(withoutMissing(ORDER_TEMPLATES[lang][k], vars), vars);
  };

  return (
    <MessageDialog
      name={order.clientName}
      phone={order.clientPhone}
      options={OPTIONS}
      initialKind={defaultKind(order, totals.dueAmount)}
      fill={fill}
      extras={({ text, setText }) => (
        <InvoiceAttachment
          source={{ number: orderNo, resolve: async () => ({ pdfUrl: `/api/gifts/orders/${id}/invoice`, linkUrl: `/api/gifts/orders/${id}/share-link` }) }}
          phone={order.clientPhone}
          text={text}
          setText={setText}
        />
      )}
      onClose={onClose}
    />
  );
}
