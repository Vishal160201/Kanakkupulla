import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess } from "@/lib/authz";
import { createInvoiceToken } from "@/lib/invoiceLink";

// POST /api/invoices/[id]/share-link — a link the client can open without signing in (expires in 30 days),
// for the WhatsApp / SMS message. Same access as viewing the invoice.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAccess("bookings", "VIEW");
  if (auth.error) return auth.error;
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id, deletedAt: null }, select: { id: true } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const { token, expiresAt } = createInvoiceToken(invoice.id);
  const origin = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/api/invoices/share/${token}`, expiresAt }, { headers: { "Cache-Control": "private, no-store" } });
}
