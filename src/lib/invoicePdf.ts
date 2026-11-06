import prisma from '@/lib/prisma';
import sharp from 'sharp';
import { buildInvoiceViewModel, buildOrderInvoiceViewModel, orderNumberOf } from '@/components/invoices/utils/invoiceLogic';
import { renderInvoicePdf } from '@/components/invoices/renderInvoicePdf';
import { fetchDriveFile } from '@/lib/googleDriveAuth';

/** Any photo, cropped to the invoice's header frame, as a data URL the PDF renderer can embed. */
async function cropToHeroFrame(image: Buffer): Promise<string> {
  const jpeg = await sharp(image).rotate().resize(600, 820, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

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

/**
 * Builds a booking invoice's PDF (shared by the signed-in route and the client's shared link).
 * `driveUserId` is whose Google Drive the couple photo is read from; null when the booking or invoice is gone.
 */
export async function renderBookingInvoice(invoiceId: string, { driveUserId, origin }: { driveUserId?: string | null; origin: string }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, deletedAt: null },
    include: { lineItems: true }
  });

  if (!invoice) {
    return null;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: invoice.bookingId, deletedAt: null },
    include: { client: true }
  });

  if (!booking) {
    return null;
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
  if (fileId && driveUserId) {
    try {
      const res = await fetchDriveFile({ user: { id: driveUserId } }, fileId);
      if (res.ok && /^image\//.test(res.headers.get('Content-Type') || '')) {
        heroImageUrl = await cropToHeroFrame(Buffer.from(await res.arrayBuffer()));
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
    assetBase: origin,
    heroImageUrl,
    photographerNames,
  });

  const pdf = await renderInvoicePdf(viewModel);
  return { pdf, filename: `${invoice.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, '')}.pdf` };
}

/** The order's first image attachment (pasted image or Drive file), cropped for the header; undefined if none or unreadable. */
async function orderHeroImage(customData: unknown, driveUserId: string | null | undefined): Promise<string | undefined> {
  if (!customData || typeof customData !== 'object') return undefined;
  for (const value of Object.values(customData as Record<string, unknown>)) {
    try {
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        return await cropToHeroFrame(Buffer.from(value.slice(value.indexOf(',') + 1), 'base64'));
      }
      const drive = value && typeof value === 'object' && 'driveFile' in value ? (value as { driveFile?: Record<string, unknown> }).driveFile : undefined;
      const fileId = drive && (drive.id ?? drive.driveFileId);
      const mime = drive && typeof drive.mimeType === 'string' ? drive.mimeType : 'image/';
      if (typeof fileId === 'string' && mime.startsWith('image/') && driveUserId) {
        const res = await fetchDriveFile({ user: { id: driveUserId } }, fileId);
        if (res.ok && /^image\//.test(res.headers.get('Content-Type') || '')) return await cropToHeroFrame(Buffer.from(await res.arrayBuffer()));
      }
    } catch (e) {
      console.error('Order invoice image unavailable:', e);
    }
  }
  return undefined;
}

/** A gift/frame order's invoice PDF, with the same figures as the order screen; null when the order is gone. */
export async function renderOrderInvoice(orderId: string, { driveUserId, origin }: { driveUserId?: string | null; origin: string }) {
  const order = await prisma.productOrder.findUnique({
    where: { id: orderId },
    include: { product: { select: { name: true, description: true } }, transactions: { where: { deletedAt: null, type: 'INCOME' }, select: { amount: true, date: true } } },
  });
  if (!order) return null;
  const settingsRecords = await prisma.systemSetting.findMany({ where: { key: { startsWith: 'studio_' } }, select: { key: true, value: true } });
  const settings: Record<string, string> = {};
  for (const s of settingsRecords) if (typeof s.value === 'string' || typeof s.value === 'number') settings[s.key] = String(s.value);

  const viewModel = buildOrderInvoiceViewModel({ ...order, payments: order.transactions }, settings, {
    assetBase: origin,
    heroImageUrl: await orderHeroImage(order.customData, driveUserId),
  });
  const pdf = await renderInvoicePdf(viewModel);
  return { pdf, filename: `Invoice-${orderNumberOf(order).replace(/[^A-Za-z0-9_-]/g, '')}.pdf` };
}
