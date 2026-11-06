import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readInvoiceToken } from "@/lib/invoiceLink";
import { renderBookingInvoice } from "@/lib/invoicePdf";
import { MINUTE, limitRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const gone = () =>
  new NextResponse("This invoice link has expired or is no longer valid. Please ask the studio for a new one.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

// GET /api/invoices/share/[token] — the client's copy of an invoice, from the signed link in their message.
// No sign-in: the token itself is the permission (one invoice, until it expires).
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limited = await limitRequest(request, "invoice-link", 30, MINUTE);
  if (limited) return limited;
  const invoiceId = readInvoiceToken((await params).token);
  if (!invoiceId) return gone();
  try {
    // The couple photo comes from the Drive of whoever created the booking (placeholder if not connected)
    const owner = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { booking: { select: { createdById: true } } } });
    const result = await renderBookingInvoice(invoiceId, { driveUserId: owner?.booking.createdById, origin: process.env.NEXTAUTH_URL ?? new URL(request.url).origin });
    if (!result) return gone();
    return new NextResponse(new Uint8Array(result.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("Shared invoice failed:", error);
    return NextResponse.json({ error: "Couldn't open the invoice" }, { status: 500 });
  }
}
