"use client";

import MessageDialog, { type MessageOption } from "@/components/shared/MessageDialog";
import { formatINR } from "@/components/inventory/inventoryUtils";
import { STUDIO_DETAILS } from "@/lib/constants";
import { STUDIO_TEMPLATES, messageDate, renderTemplate, withoutMissing, type MessageLanguage, type StudioMessageKind } from "@/lib/whatsapp";
import type { BookingDetail } from "@/types/bookings";

const OPTIONS: MessageOption<StudioMessageKind>[] = [
  { kind: "bookingConfirmed", label: "Booking confirmed", icon: "ph-calendar-check" },
  { kind: "shootReminder", label: "Shoot reminder", icon: "ph-alarm" },
  { kind: "paymentDue", label: "Payment pending", icon: "ph-currency-inr" },
  { kind: "thanks", label: "Payment received", icon: "ph-check-circle" },
  { kind: "galleryReady", label: "Photos ready", icon: "ph-images" },
  { kind: "albumReady", label: "Album ready", icon: "ph-book-open" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Default message for where the booking is: album ready → shoot coming up → money owed → photos → thanks. */
function defaultKind(booking: BookingDetail, due: number): StudioMessageKind {
  if (String(booking.customData?.fld_b_album_status ?? "").toLowerCase() === "ready for delivery") return "albumReady";
  const daysToShoot = (new Date(booking.date).getTime() - Date.now()) / DAY_MS;
  if (daysToShoot > -1) return daysToShoot <= 3 ? "shootReminder" : "bookingConfirmed";
  if (due > 0) return "paymentDue";
  if (booking.galleryUrl) return "galleryReady";
  return "thanks";
}

/** WhatsApp / SMS the booking's client from ready-made studio messages. */
export default function BookingWhatsAppDialog({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const cd = booking.customData;
  // Same totals as the Financials card
  const total = Number(booking.order?.package || cd?.fld_b_package || 0);
  const paid = Number(booking.order?.advance || cd?.fld_b_advance || 0);
  const due = Math.max(0, total - paid);
  const studio = booking.studio ?? { name: STUDIO_DETAILS.name, phone: STUDIO_DETAILS.phone, upiId: STUDIO_DETAILS.upiId };
  const name = booking.client?.name || booking.title || String(cd?.fld_b_client ?? "") || "there";
  const phone = booking.client?.phone || booking.phone || String(cd?.fld_b_phone ?? "") || null;

  const fill = (k: StudioMessageKind, lang: MessageLanguage) => {
    const vars = {
      customer: name,
      // A blank category would drop whole sentences, so fall back to "photo"
      category: booking.category || (lang === "ta" ? "புகைப்பட" : "photo"),
      date: booking.date ? messageDate(booking.date, lang) : "",
      time: booking.time,
      venue: booking.location,
      package: booking.packageName ?? "",
      paid: paid > 0 ? formatINR(paid, { decimals: false }) : "",
      due: due > 0 ? formatINR(due, { decimals: false }) : "",
      gallery: booking.galleryUrl ?? "",
      upi: studio.upiId,
      phone: studio.phone,
      shop: studio.name,
    };
    return renderTemplate(withoutMissing(STUDIO_TEMPLATES[lang][k], vars), vars);
  };

  return <MessageDialog name={name} phone={phone} options={OPTIONS} initialKind={defaultKind(booking, due)} fill={fill} onClose={onClose} />;
}
