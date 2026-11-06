"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateInvoiceAction } from "@/app/actions";
import type { BookingDetail } from "@/types/bookings";
import { cn } from "@/lib/utils";

const LINK_LINE = /\n*Invoice: https?:\/\/\S+$/;

const chip =
  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none";

/**
 * Attach the booking's invoice to a WhatsApp/SMS message. wa.me links can only carry text, so the invoice goes as
 * a signed link in the message (works everywhere), or as the PDF itself through the phone's share sheet.
 */
export default function InvoiceAttachment({
  booking,
  canManage,
  text,
  setText,
}: {
  booking: BookingDetail;
  canManage: boolean;
  text: string;
  setText: (text: string) => void;
}) {
  const existing = booking.invoice && !booking.invoice.deletedAt ? booking.invoice : null;
  const [invoice, setInvoice] = useState<{ id: string; number?: string } | null>(existing ? { id: existing.id, number: existing.invoiceNumber } : null);
  const [busy, setBusy] = useState<"link" | "pdf" | null>(null);
  const linked = LINK_LINE.test(text);

  /** The booking's invoice, created on first use (needs Bookings → Manage, like the Invoice button). */
  const ensureInvoice = async () => {
    if (invoice) return invoice;
    const res = await generateInvoiceAction(booking.id);
    if (!res.success || !res.invoiceId) throw new Error(res.error || "Couldn't create the invoice");
    const created: { id: string; number?: string } = { id: res.invoiceId };
    setInvoice(created);
    return created;
  };

  const addLink = async () => {
    setBusy("link");
    try {
      const inv = await ensureInvoice();
      const res = await fetch(`/api/invoices/${encodeURIComponent(inv.id)}/share-link`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't make the invoice link");
      setText(`${text.replace(LINK_LINE, "").trimEnd()}\n\nInvoice: ${data.url}`);
      toast.success("Invoice link added", { description: "The client can open it for 30 days, no login needed." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the invoice");
    } finally {
      setBusy(null);
    }
  };

  const sharePdf = async () => {
    setBusy("pdf");
    try {
      const inv = await ensureInvoice();
      const res = await fetch(`/api/invoices/${encodeURIComponent(inv.id)}/pdf`);
      if (!res.ok) throw new Error("Couldn't load the invoice PDF");
      const name = `${inv.number ?? res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1]?.replace(/\.pdf$/, "") ?? "Invoice"}.pdf`;
      const file = new File([await res.blob()], name, { type: "application/pdf" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        // Phone share sheet: pick WhatsApp and the PDF goes with the message
        await navigator.share({ files: [file], text: text.replace(LINK_LINE, "").trim() });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        toast.success("Invoice downloaded", { description: "Attach it in WhatsApp with the paperclip, or add the invoice link instead." });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // closed the share sheet
      toast.error(err instanceof Error ? err.message : "Couldn't share the invoice");
    } finally {
      setBusy(null);
    }
  };

  if (!invoice && !canManage) return null;
  const canSharePdf = typeof navigator !== "undefined" && typeof navigator.canShare === "function";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-auto">
        <i className="ph-bold ph-receipt text-sm" aria-hidden="true" />
        Invoice{invoice?.number ? ` ${invoice.number}` : ""}
      </span>
      <button
        type="button"
        onClick={addLink}
        disabled={busy !== null}
        className={cn(chip, linked ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200")}
      >
        <i className={cn("ph-bold", busy === "link" ? "ph-circle-notch animate-spin" : linked ? "ph-check" : "ph-link")} aria-hidden="true" />
        {linked ? "Link added" : "Add invoice link"}
      </button>
      <button type="button" onClick={sharePdf} disabled={busy !== null} className={cn(chip, "border-slate-200 bg-white text-slate-700 hover:border-emerald-200")}>
        <i className={cn("ph-bold", busy === "pdf" ? "ph-circle-notch animate-spin" : canSharePdf ? "ph-share-network" : "ph-download-simple")} aria-hidden="true" />
        {canSharePdf ? "Share with PDF" : "Download PDF"}
      </button>
    </div>
  );
}
