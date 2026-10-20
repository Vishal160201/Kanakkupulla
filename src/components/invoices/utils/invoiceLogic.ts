import type { Booking, Client } from '@prisma/client';
import type { InvoiceLineItemRow, InvoiceRow, TransactionRow } from '@/lib/prisma';
import { InvoiceViewModel, InvoiceLineItemVM, SummaryCardVariant } from '../types/invoiceViewModel';
import { InvoiceStatus } from '../types/invoiceStatus';
import { SummaryRow } from '../types/summaryRow';
import { PaymentStep } from '../types/paymentProgress';
import { formatCurrency } from './currency';
import { formatDate } from './date';
import { colors } from '../theme/invoiceTheme';
import { createInvoiceAssets } from './assetRegistry';
import { STUDIO_DETAILS } from '@/lib/constants';

type FullBooking = Booking & { client: Client };
type FullInvoice = InvoiceRow & { lineItems: InvoiceLineItemRow[] };

export interface BuildInvoiceViewModelOptions {
  /** App origin used to build absolute asset URLs, e.g. process.env.NEXTAUTH_URL ?? new URL(request.url).origin */
  baseUrl: string;
  qrCodeDataUrl?: string;
  /** Overrides the hero image resolved from booking.customData. */
  heroImageUrl?: string;
}

export const buildInvoiceViewModel = (
  invoice: FullInvoice,
  booking: FullBooking,
  transactions: TransactionRow[],
  settings: Record<string, string>,
  { baseUrl, qrCodeDataUrl, heroImageUrl: heroImageOverride }: BuildInvoiceViewModelOptions
): InvoiceViewModel => {
  const assets = createInvoiceAssets(baseUrl);

  // Calculate Totals (Removed GST completely)
  const safeNumber = (val: unknown): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const decimal = val as { toNumber?: () => number };
    if (typeof decimal.toNumber === 'function') return decimal.toNumber();
    if (typeof val === 'string') return Number(val) || 0;
    return Number(val) || 0;
  };
  
  const subtotal = invoice.lineItems.reduce((acc, item) => acc + safeNumber(item.amount), 0);
  const discount = safeNumber(invoice.discount);
  const total = subtotal - discount;
  
  // Calculate Paid and Balance
  const amountPaid = transactions
    .filter(t => t.status === 'SETTLED' || t.status === 'COMPLETED')
    .reduce((acc, t) => acc + safeNumber(t.amount), 0);
    
  let balanceDue = total - amountPaid;
  if (balanceDue < 0) balanceDue = 0; // clamp display

  // Determine Status
  let status: InvoiceStatus = 'PENDING';
  if (balanceDue === 0 && total > 0) {
    status = 'PAID';
  } else if (amountPaid > 0 && balanceDue > 0) {
    status = 'PARTIALLY_PAID';
  } else if (new Date() > new Date(booking.date) && balanceDue > 0) {
    status = 'OVERDUE';
  }

  const statusColorMap: Record<InvoiceStatus, string> = {
    PENDING: colors.pendingOrange,
    PARTIALLY_PAID: colors.pendingOrange,
    PAID: colors.successGreen,
    OVERDUE: colors.overdueRed,
  };

  const statusTextMap: Record<InvoiceStatus, string> = {
    PENDING: 'PENDING',
    PARTIALLY_PAID: 'PARTIALLY PAID',
    PAID: 'PAID IN FULL',
    OVERDUE: 'OVERDUE',
  };

  // Build Summary Rows
  const summaryRows: SummaryRow[] = [
    { label: 'Subtotal', value: formatCurrency(subtotal) },
  ];
  if (discount > 0) {
    summaryRows.push({ label: 'Discount', value: `-${formatCurrency(discount)}` });
  }
  summaryRows.push({ label: 'Total', value: formatCurrency(total) });
  summaryRows.push({ label: 'Amount Paid', value: `-${formatCurrency(amountPaid)}` });
  summaryRows.push({ label: 'Balance Due', value: formatCurrency(balanceDue), isTotal: true });

  // Summary Card Variant
  const summaryCardVariant: SummaryCardVariant = status === 'PAID' ? {
    theme: 'success',
    title: 'PAID IN FULL',
    amount: formatCurrency(0),
    subLabel: 'Payment Completed'
  } : {
    theme: 'dark',
    title: 'AMOUNT DUE',
    amount: formatCurrency(balanceDue),
    subLabel: 'Balance to be paid'
  };

  // Build Dynamic Payment Progress Timeline
  const paymentPercentage = total > 0 ? Math.min(100, Math.round((amountPaid / total) * 100)) : 100;
  const steps: PaymentStep[] = [];
  
  const sortedTransactions = [...transactions]
    .filter(t => t.status === 'SETTLED' || t.status === 'COMPLETED')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTransactions.forEach((t, i) => {
    steps.push({
      label: i === 0 ? 'Advance' : `Payment ${i + 1}`,
      amount: formatCurrency(safeNumber(t.amount)),
      completed: true,
      date: formatDate(t.date),
    });
  });

  // Add pending balance step if not fully paid
  if (balanceDue > 0) {
    steps.push({
      label: steps.length === 0 ? 'Full Payment' : steps.length === 1 ? 'Second Payment' : 'Final Payment',
      amount: formatCurrency(balanceDue),
      completed: false,
    });
  }

  // Hero Image resolution hierarchy: Album Cover -> Booking Thumbnail -> Fallback Placeholder
  const bookingCustomData = booking.customData as { albumCoverUrl?: string; thumbnailUrl?: string } | null;
  const heroImageUrl = heroImageOverride || bookingCustomData?.albumCoverUrl || bookingCustomData?.thumbnailUrl || assets.photoPlaceholder;

  // Build Line Items
  const items: InvoiceLineItemVM[] = invoice.lineItems.map(li => ({
    description: li.description,
    qty: li.quantity,
    unitPrice: formatCurrency(safeNumber(li.rate)),
    total: formatCurrency(safeNumber(li.amount)),
  }));

  if (items.length === 0) {
    items.push({
      description: 'No items found',
      qty: 0,
      unitPrice: formatCurrency(0),
      total: formatCurrency(0),
    });
  }

  // Footer notes
  const footerNotes = [
    '50% advance is required to confirm the booking.',
    'Balance to be cleared before the event or delivery.',
    'Album delivery within 30 working days after the event.',
    'Raw photos/videos will not be shared.',
    'Cancellation 15 days before the event is non-refundable.'
  ];

  return {
    invoiceNumber: invoice.invoiceNumber,
    clientName: booking.client.name,
    clientPhone: booking.client.phone,
    clientEmail: booking.client.email || 'N/A',
    clientAddress: 'N/A',
    
    fromName: settings.studio_name || STUDIO_DETAILS.name,
    fromPhone: settings.studio_phone || STUDIO_DETAILS.phone,
    fromEmail: settings.studio_email || STUDIO_DETAILS.email,
    fromAddress: settings.studio_address || STUDIO_DETAILS.address,
    
    formattedInvoiceDate: formatDate(invoice.createdAt),
    formattedDueDate: formatDate(booking.date), 
    
    eventDate: formatDate(booking.date),
    venue: booking.location || 'N/A',
    packageName: booking.packageName || 'N/A',
    photographers: booking.photographers ? String(booking.photographers) : 'Team Moondot',
    
    status,
    statusText: statusTextMap[status],
    statusColor: statusColorMap[status],
    
    heroImageUrl,
    qrCodeDataUrl: qrCodeDataUrl || '',
    
    items,
    summaryCardVariant,
    summaryRows,
    paymentProgress: {
      percentage: paymentPercentage,
      steps
    },
    
    footerMode: status === 'PAID' ? 'review' : 'payment',
    footerNotes,
    
    socials: {
      instagram: settings.studio_instagram || 'instagram.com/moondot.studio',
      website: settings.studio_website || 'www.moondotstudio.com',
      phone: settings.studio_phone || STUDIO_DETAILS.phone,
      email: settings.studio_email || STUDIO_DETAILS.email,
    },

    assets,

    settings
  };
};
