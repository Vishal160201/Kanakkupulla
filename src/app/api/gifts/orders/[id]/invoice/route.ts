import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/authz";
import { renderOrderInvoice } from "@/lib/invoicePdf";

// GET /api/gifts/orders/[id]/invoice — the order's invoice PDF (same design as booking invoices).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAccess("gifts", "VIEW");
    if (auth.error) return auth.error;
    const { id } = await params;
    const result = await renderOrderInvoice(id, { driveUserId: auth.user.id, origin: process.env.NEXTAUTH_URL ?? new URL(req.url).origin });
    if (!result) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return new NextResponse(new Uint8Array(result.pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${result.filename}"`, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to generate order invoice:", error);
    return NextResponse.json({ error: "Couldn't create the invoice" }, { status: 500 });
  }
}
