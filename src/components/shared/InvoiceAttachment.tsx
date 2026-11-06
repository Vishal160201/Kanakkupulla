"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { extensionCanUseWhatsApp, sendOnWhatsAppWeb } from "@/lib/extension/bridge";
import { normalizePhone } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const LINK_LINE = /\n*Invoice: https?:\/\/\S+$/;

const chip =
  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none";

export interface InvoiceSource {
  /** Shown next to "Invoice" when known (INV-0245 / MDorder-1F0974) */
  number?: string;
  /** Where the PDF and its share link come from; may create the invoice first (bookings) */
  resolve: () => Promise<{ pdfUrl: string; linkUrl: string; number?: string }>;
}

/**
 * Attach an invoice to a WhatsApp/SMS message. wa.me links can only carry text, so the invoice goes as a signed
 * link in the message (works everywhere), as the PDF through the phone's share sheet, or, with the Kanakkupulla
 * Sync extension on a computer, as the PDF itself in WhatsApp Web. Nothing is sent without the user pressing Send.
 */
export default function InvoiceAttachment({ source, phone, text, setText }: { source: InvoiceSource; phone: string | null | undefined; text: string; setText: (text: string) => void }) {
  const [number, setNumber] = useState(source.number);
  const [busy, setBusy] = useState<"link" | "pdf" | "web" | null>(null);
  const [webReady, setWebReady] = useState(false);
  const linked = LINK_LINE.test(text);
  const digits = normalizePhone(phone);

  useEffect(() => {
    let live = true;
    extensionCanUseWhatsApp().then((ok) => live && setWebReady(ok));
    return () => {
      live = false;
    };
  }, []);

  const resolve = async () => {
    const r = await source.resolve();
    if (r.number) setNumber(r.number);
    return r;
  };

  const fetchPdf = async () => {
    const { pdfUrl, number: n } = await resolve();
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error("Couldn't load the invoice PDF");
    const name = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `${n ?? number ?? "Invoice"}.pdf`;
    return new File([await res.blob()], name, { type: "application/pdf" });
  };

  const message = () => text.replace(LINK_LINE, "").trim();

  const addLink = async () => {
    setBusy("link");
    try {
      const { linkUrl } = await resolve();
      const res = await fetch(linkUrl, { method: "POST" });
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
      const file = await fetchPdf();
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        // Phone share sheet: pick WhatsApp and the PDF goes with the message
        await navigator.share({ files: [file], text: message() });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
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

  const sendOnWeb = async () => {
    if (!digits) return toast.error("Add a usable mobile number first.");
    setBusy("web");
    try {
      const file = await fetchPdf();
      const result = await sendOnWhatsAppWeb({ phone: digits, text: message(), filename: file.name, pdf: file });
      if (!result.ok) throw new Error(result.message);
      if (result.stage === "attachedNoCaption") {
        await navigator.clipboard.writeText(message()).catch(() => {});
        toast.success("PDF attached in WhatsApp Web", { description: "The message is copied: paste it as the caption, then press Send." });
      } else {
        toast.success("Ready in WhatsApp Web", { description: "The PDF and message are attached. Check them and press Send." });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open WhatsApp Web");
    } finally {
      setBusy(null);
    }
  };

  const canSharePdf = typeof navigator !== "undefined" && typeof navigator.canShare === "function";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-auto">
        <i className="ph-bold ph-receipt text-sm" aria-hidden="true" />
        Invoice{number ? ` ${number}` : ""}
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
      {webReady && (
        <button type="button" onClick={sendOnWeb} disabled={busy !== null || !digits} className={cn(chip, "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300")}>
          <i className={cn(busy === "web" ? "ph-bold ph-circle-notch animate-spin" : "ph-fill ph-whatsapp-logo")} aria-hidden="true" />
          Send PDF on WhatsApp Web
        </button>
      )}
    </div>
  );
}
