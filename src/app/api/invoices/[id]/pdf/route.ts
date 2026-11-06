import { NextResponse } from 'next/server';
import { requireAccess } from '@/lib/authz';
import { renderBookingInvoice } from '@/lib/invoicePdf';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAccess('bookings', 'VIEW');
    if (auth.error) return auth.error;
    const { id } = await params;
    const result = await renderBookingInvoice(id, { driveUserId: auth.user.id, origin: process.env.NEXTAUTH_URL ?? new URL(req.url).origin });
    if (!result) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    return new NextResponse(new Uint8Array(result.pdf), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${result.filename}"` },
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
