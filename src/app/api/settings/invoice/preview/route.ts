import { NextResponse } from "next/server";
import type { Booking, Client } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireOwner } from "@/lib/authz";
import { INVOICE_SETTING_KEYS } from "@/lib/invoiceSettings";
import { buildInvoiceViewModel } from "@/components/invoices/utils/invoiceLogic";
import { renderInvoicePdf } from "@/components/invoices/renderInvoicePdf";

export const dynamic = "force-dynamic";

const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

// GET /api/settings/invoice/preview — a sample half-paid invoice using the saved studio details, so owners can
// check their edits. Owner only; nothing is stored.
export async function GET(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const rows = await prisma.systemSetting.findMany({ where: { key: { in: [...INVOICE_SETTING_KEYS] } }, select: { key: true, value: true } });
  const settings: Record<string, string> = {};
  for (const r of rows) if (typeof r.value === "string" || typeof r.value === "number") settings[r.key] = String(r.value);

  const now = new Date();
  const line = (id: string, description: string, quantity: number, rate: number) => ({ id, invoiceId: "sample", description, quantity, rate, amount: rate * quantity, createdAt: now, updatedAt: now });
  const invoice = { id: "sample", invoiceNumber: "INV-SAMPLE", bookingId: "sample", discount: 1000, createdAt: now, updatedAt: now, deletedAt: null,
    lineItems: [line("1", "Wedding Photography Package\nFull-day candid and traditional coverage", 1, 30000), line("2", "Premium Photo Album\n12x18 inch, 40 pages", 1, 6000), line("3", "Drone Coverage\nAerial shots and video", 1, 3000)] };
  const booking = {
    id: "sample", clientId: "sample", category: "Wedding", date: daysFromNow(20), time: "06:00 AM", location: "Sample Mandapam, Tenkasi", status: "Confirmed",
    createdAt: now, updatedAt: now, contractUrl: null, galleryUrl: null, attachments: null, bookingNumber: null, createdById: null, customData: null,
    deletedAt: null, inclusions: null, notes: null, packageName: "Gold Package", photographers: null, updatedById: null, galleryDelivered: false, albumStatus: "PENDING",
    client: { id: "sample", name: "Sample Client", phone: "+91 98765 43210", email: "client@example.com", createdAt: now, updatedAt: now },
  } as unknown as Booking & { client: Client };

  const viewModel = buildInvoiceViewModel(invoice, booking, [{ amount: 15000, date: daysFromNow(-10), status: "SETTLED" }], settings, {
    assetBase: process.env.NEXTAUTH_URL ?? new URL(request.url).origin,
    photographerNames: [auth.user.name ?? ""].filter(Boolean),
  });
  const pdf = await renderInvoicePdf(viewModel);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="invoice-preview.pdf"', "Cache-Control": "private, no-store" },
  });
}
