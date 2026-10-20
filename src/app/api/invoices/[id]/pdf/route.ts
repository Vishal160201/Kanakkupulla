import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';
import QRCode from 'qrcode';
import { initFonts } from '@/components/invoices/theme/invoiceTheme';
import { buildInvoiceViewModel } from '@/components/invoices/utils/invoiceLogic';
import { requirePermission } from '@/lib/authz';
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
    const auth = await requirePermission('manage_transactions');
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

    let qrCodeDataUrl = '';
    if (settings.studio_upi_id) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.studio_upi_id)}&pn=${encodeURIComponent(settings.studio_bank_name || 'Studio')}`;
      qrCodeDataUrl = await QRCode.toDataURL(upiUrl, { margin: 1, width: 200, color: { dark: '#000000', light: '#ffffff' } });
    }

    // Embed the hero image as a data URL: the PDF renderer can't reach the session-protected thumbnail proxy
    let heroImageUrl: string | undefined;
    {
      const fileId = heroFileId(booking.attachments);
      if (fileId) {
        try {
          const res = await fetchDriveFile({ user: auth.user }, fileId);
          const contentType = res.headers.get('Content-Type') || '';
          if (res.ok && /^image\/(png|jpe?g)$/.test(contentType)) {
            heroImageUrl = `data:${contentType};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
          }
        } catch (e) {
          console.error('Invoice hero image unavailable:', e);
        }
      }
    }

    const viewModel = buildInvoiceViewModel(
      invoice,
      booking,
      transactions,
      settings,
      {
        baseUrl: process.env.NEXTAUTH_URL ?? new URL(req.url).origin,
        qrCodeDataUrl: qrCodeDataUrl || undefined,
        heroImageUrl,
      }
    );

    initFonts();
    
    const pdf = await renderToBuffer(InvoiceDocument({ viewModel }));

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${invoice.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, '')}.pdf"`);

    return new NextResponse(new Uint8Array(pdf), { headers });

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
