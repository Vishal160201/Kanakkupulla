import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import sharp from 'sharp';
import { buildInvoiceViewModel } from '@/components/invoices/utils/invoiceLogic';
import { renderInvoicePdf } from '@/components/invoices/renderInvoicePdf';
import { requireAccess } from '@/lib/authz';
import { fetchDriveFile } from '@/lib/googleDriveAuth';

/** First attachment that references a Drive file (`{ id }` or `{ fileId }`). */
function heroFileId(attachments: unknown): string | null {
  if (!Array.isArray(attachments)) return null;
  for (const a of attachments as unknown[]) {
    if (!a || typeof a !== 'object') continue;
    const id = ('id' in a && a.id) || ('fileId' in a && a.fileId);
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAccess("bookings", "VIEW");
    if (auth.error) return auth.error;

    const { id: invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, deletedAt: null },
      include: { lineItems: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: invoice.bookingId, deletedAt: null },
      include: { client: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Associated booking not found' }, { status: 404 });
    }

    const [transactions, settingsRecords] = await Promise.all([
      prisma.transaction.findMany({
        where: { bookingId: booking.id, deletedAt: null }
      }),
      // Invoices only read the studio_* settings
      prisma.systemSetting.findMany({
        where: { key: { startsWith: 'studio_' } },
        select: { key: true, value: true }
      }),
    ]);
    const settings: Record<string, string> = {};
    for (const s of settingsRecords) {
      if (typeof s.value === 'string') settings[s.key] = s.value;
      else if (typeof s.value === 'number' || typeof s.value === 'boolean') settings[s.key] = String(s.value);
    }

    // The couple photo (first Drive attachment), cropped to the header frame; embedded as a data URL because
    // the PDF renderer can't reach the session-protected thumbnail proxy. Any failure falls back to the placeholder.
    let heroImageUrl: string | undefined;
    const fileId = heroFileId(booking.attachments);
    if (fileId) {
      try {
        const res = await fetchDriveFile({ user: auth.user }, fileId);
        if (res.ok && /^image\//.test(res.headers.get('Content-Type') || '')) {
          const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(600, 820, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80 }).toBuffer();
          heroImageUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
        }
      } catch (e) {
        console.error('Invoice hero image unavailable:', e);
      }
    }

    const photographerIds = Array.isArray(booking.photographers)
      ? booking.photographers.flatMap((p) => (typeof p === 'string' ? [p] : p && typeof p === 'object' && 'id' in p && typeof p.id === 'string' ? [p.id] : []))
      : [];
    const photographers = photographerIds.length
      ? await prisma.user.findMany({ where: { id: { in: photographerIds } }, select: { id: true, name: true } })
      : [];
    const photographerNames = photographerIds.map((pid) => photographers.find((u) => u.id === pid)?.name).filter((n): n is string => !!n);

    const viewModel = buildInvoiceViewModel(invoice, booking, transactions, settings, {
      assetBase: process.env.NEXTAUTH_URL ?? new URL(req.url).origin,
      heroImageUrl,
      photographerNames,
    });

    const pdf = await renderInvoicePdf(viewModel);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${invoice.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, '')}.pdf"`);

    return new NextResponse(new Uint8Array(pdf), { headers });

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
