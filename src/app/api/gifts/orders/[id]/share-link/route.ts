import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess } from "@/lib/authz";
import { createInvoiceToken } from "@/lib/invoiceLink";

// POST /api/gifts/orders/[id]/share-link — a link to the order's invoice the client can open without signing in
// (expires in 30 days), for the WhatsApp / SMS message. Same access as viewing the order.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAccess("gifts", "VIEW");
  if (auth.error) return auth.error;
  const { id } = await params;
  const order = await prisma.productOrder.findUnique({ where: { id }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const { token, expiresAt } = createInvoiceToken(order.id, { kind: "order" });
  const origin = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/api/invoices/share/${token}`, expiresAt }, { headers: { "Cache-Control": "private, no-store" } });
}
