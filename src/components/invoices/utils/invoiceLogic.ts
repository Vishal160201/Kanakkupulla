import type { Booking, Client } from '@prisma/client';
import type { InvoiceLineItemRow, InvoiceRow, TransactionRow } from '@/lib/prisma';
import type { InvoiceViewModel, InvoiceLineItemVM, InfoLine, EventDetail, AmountCard, PaymentMethods } from '../types/invoiceViewModel';
import type { InvoiceStatus } from '../types/invoiceStatus';
import type { SummaryRow } from '../types/summaryRow';
import type { PaymentStep } from '../types/paymentProgress';
import type { GlyphName } from '../icons/glyphs';
import { formatAmountDigits, formatCurrency } from './currency';
import { formatDate, formatShortDate } from './date';
import { createInvoiceAssets } from './assetRegistry';
import { getPdfMetadata } from './metadata';
import { INVOICE_CONSTANTS } from '../theme/constants';
import { STUDIO_DETAILS } from '@/lib/constants';
import { DEFAULT_INVOICE_TERMS, DEFAULT_ORDER_TERMS } from '@/lib/invoiceSettings';

type FullBooking = Booking & { client: Client };
type FullInvoice = InvoiceRow & { lineItems: InvoiceLineItemRow[] };
type Payment = Pick<TransactionRow, 'amount' | 'date' | 'status'>;

export interface BuildInvoiceViewModelOptions {
  /** Where the artwork lives: the app origin (https://…) or the local public/ folder */
  assetBase: string;
  /** The couple photo from Drive, already cropped (data URL); the placeholder is used without one */
  heroImageUrl?: string;
  /** Names of the booking's photographers (resolved from their user ids) */
  photographerNames?: string[];
  /** Today, for the overdue check (tests pass a fixed date) */
  now?: Date;
}


const STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid in full',
  OVERDUE: 'Overdue',
};

const num = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};
/** Money to whole paise, so float sums never print ₹0.01 balances. */
const paise = (value: unknown) => Math.round(num(value) * 100);
const rupees = (p: number) => p / 100;

const text = (value: unknown): string | undefined => {
  const s = typeof value === 'string' ? value.trim() : '';
  return s || undefined;
};
const lines = (...entries: [GlyphName, string | undefined][]): InfoLine[] =>
  entries.filter((e): e is [GlyphName, string] => !!e[1]).map(([icon, t]) => ({ icon, text: t }));

/** Icon for a line item from its wording (album, drone, video…); a camera otherwise. */
export const itemIcon = (description: string): GlyphName => {
  const d = description.toLowerCase();
  if (/album|book|print/.test(d)) return 'album';
  if (/frame|canvas|print|mug|key ?chain|magnet/.test(d)) return 'image';
  if (/drone|aerial/.test(d)) return 'drone';
  if (/light/.test(d)) return 'light';
  if (/video|film|cinema|reel/.test(d)) return 'video';
  return 'camera';
};

/** Up to three steps: paid instalments (later ones merged) then what's still due. */
export const buildPaymentSteps = (
  payments: { amount: number; date: Date }[],
  balance: number,
  dueCaption: string,
  overdue: boolean
): PaymentStep[] => {
  const max = INVOICE_CONSTANTS.maxPaymentSteps;
  const slots = balance > 0 ? max - 1 : max;
  const paid: { amount: number; date: Date; count: number }[] = payments.map((p) => ({ ...p, count: 1 }));
  if (paid.length > slots) {
    const merged = paid.splice(slots - 1);
    paid.push({ amount: merged.reduce((s, p) => s + p.amount, 0), date: merged[merged.length - 1].date, count: merged.length });
  }
  const steps: PaymentStep[] = paid.map((p, i) => {
    const last = i === paid.length - 1;
    const label =
      i === 0 ? (last && balance <= 0 && p.count === 1 ? 'Full payment' : 'Advance')
      : last && balance <= 0 ? 'Final payment'
      : p.count > 1 ? `Payments ${i + 1}–${i + p.count}`
      : `Payment ${i + 1}`;
    const date = formatShortDate(p.date);
    return { label, state: 'done', caption: date ? `Paid · ${date}` : 'Paid', amount: formatCurrency(p.amount) };
  });
  if (balance > 0) {
    steps.push({
      label: steps.length === 0 ? 'Full payment' : 'Balance',
      state: overdue ? 'overdue' : 'due',
      caption: overdue ? 'Overdue' : `Due · ${dueCaption}`,
      amount: formatCurrency(balance),
    });
  }
  return steps;
};

interface CoreInput {
  invoiceNumber: string;
  invoiceDate: Date | string;
  subtotalP: number;
  discountP: number;
  /** Payments that count towards the invoice (the caller decides which), any order */
  payments: { amount: unknown; date: Date | string }[];
  /** When the balance is due (event / delivery date); past it with nothing paid means overdue */
  dueAt: Date | string | null | undefined;
  /** Caption of the still-due step before and after the due date */
  dueCaptions: [before: string, after: string];
  termsKey: 'studio_terms' | 'studio_order_terms';
  defaultTerms: string[];
  settings: Record<string, string>;
  assetBase: string;
  now: Date;
}

/** Everything both invoices share: money, status, payment progress, how to pay, the studio and the terms. */
function buildCore(c: CoreInput) {
  const assets = createInvoiceAssets(c.assetBase);
  const setting = (key: string) => text(c.settings[key]);

  const discountP = Math.min(Math.max(c.discountP, 0), c.subtotalP);
  const totalP = c.subtotalP - discountP;
  const settled = [...c.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const paidP = settled.reduce((s, t) => s + paise(t.amount), 0);
  const balanceP = Math.max(totalP - paidP, 0);
  const overpaidP = Math.max(paidP - totalP, 0);

  const dueAt = c.dueAt ? new Date(c.dueAt) : null;
  const duePassed = !!dueAt && !Number.isNaN(dueAt.getTime()) && c.now > dueAt;
  let status: InvoiceStatus = 'PENDING';
  if (balanceP === 0 && totalP > 0) status = 'PAID';
  else if (paidP > 0 && balanceP > 0) status = 'PARTIALLY_PAID';
  else if (duePassed && balanceP > 0) status = 'OVERDUE';

  const summaryRows: SummaryRow[] = [{ label: 'Subtotal', value: formatCurrency(rupees(c.subtotalP)) }];
  if (discountP > 0) summaryRows.push({ label: 'Discount', value: `- ${formatCurrency(rupees(discountP))}`, tone: 'discount' });
  if (discountP > 0 && paidP > 0) summaryRows.push({ label: 'Total', value: formatCurrency(rupees(totalP)), tone: 'strong' });
  if (paidP > 0) summaryRows.push({ label: 'Amount paid', value: `- ${formatCurrency(rupees(Math.min(paidP, totalP)))}`, tone: 'paid' });
  if (overpaidP > 0) summaryRows.push({ label: 'Overpaid', value: formatCurrency(rupees(overpaidP)), tone: 'paid' });

  const amountCard: AmountCard =
    status === 'PAID'
      ? { tone: 'paid', title: 'Total amount', amount: formatAmountDigits(rupees(totalP)), note: overpaidP > 0 ? `Overpaid by ${formatCurrency(rupees(overpaidP))}` : 'Paid in full' }
      : status === 'OVERDUE'
        ? { tone: 'overdue', title: 'Amount overdue', amount: formatAmountDigits(rupees(balanceP)), note: 'Payment is overdue' }
        : { tone: 'due', title: 'Amount due', amount: formatAmountDigits(rupees(balanceP)), note: 'Balance to be paid' };

  const steps = buildPaymentSteps(
    settled.map((t) => ({ amount: rupees(paise(t.amount)), date: new Date(t.date) })),
    rupees(balanceP),
    duePassed ? c.dueCaptions[1] : c.dueCaptions[0],
    status === 'OVERDUE'
  );

  const studioName = setting('studio_name') ?? STUDIO_DETAILS.name;
  const studioPhone = setting('studio_phone') ?? STUDIO_DETAILS.phone;
  const studioEmail = setting('studio_email') ?? STUDIO_DETAILS.email;

  let payment: PaymentMethods | undefined;
  if (status !== 'PAID') {
    const accountNumber = setting('studio_bank_account_number');
    const ifsc = setting('studio_bank_ifsc');
    const waDigits = studioPhone.replace(/\D/g, '');
    payment = {
      upiId: setting('studio_upi_id') ?? STUDIO_DETAILS.upiId,
      bank: accountNumber && ifsc ? { accountName: setting('studio_bank_account_name') ?? studioName, accountNumber, ifsc, bankName: setting('studio_bank_name') } : undefined,
      whatsapp: waDigits.length >= 10
        ? {
            phone: studioPhone,
            link: `https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}?text=${encodeURIComponent(`Hi, sharing the payment for invoice ${c.invoiceNumber} (${formatCurrency(rupees(balanceP))}).`)}`,
          }
        : undefined,
    };
  }

  const meta = getPdfMetadata(c.invoiceNumber);
  return {
    invoiceNumber: c.invoiceNumber,
    status,
    statusLabel: STATUS_LABEL[status],
    invoiceDate: formatDate(c.invoiceDate) ?? '',
    studio: { name: studioName, tagline: setting('studio_tagline') ?? 'Capturing your memories' },
    from: {
      name: studioName,
      lines: lines(['pin', setting('studio_address') ?? STUDIO_DETAILS.address], ['file', setting('studio_gstin') && `GSTIN: ${setting('studio_gstin')}`], ['phone', studioPhone], ['mail', studioEmail]),
    },
    summaryRows,
    balanceDue: formatCurrency(rupees(balanceP)),
    balanceDueAmount: rupees(balanceP),
    amountCard,
    paymentProgress: {
      percentage: totalP > 0 ? Math.min(100, Math.round((paidP / totalP) * 100)) : 0,
      paid: formatCurrency(rupees(Math.min(paidP, totalP))),
      total: formatCurrency(rupees(totalP)),
      steps,
    },
    payment,
    review: status === 'PAID' ? { url: setting('studio_review_url') } : undefined,
    terms: setting(c.termsKey)?.split('\n').map((t) => t.trim()).filter(Boolean) ?? c.defaultTerms,
    contacts: lines(
      ['instagram', setting('studio_instagram') ?? STUDIO_DETAILS.instagram],
      ['globe', setting('studio_website') ?? STUDIO_DETAILS.website],
      ['phone', studioPhone],
      ['mail', studioEmail]
    ),
    assets,
    meta: { title: meta.title, subject: meta.subject, keywords: meta.keywords, templateVersion: INVOICE_CONSTANTS.templateVersion },
  };
}

const details = (entries: [GlyphName, string, string | undefined][]): EventDetail[] =>
  entries.filter((e) => !!e[2]).map(([icon, label, value]) => ({ icon, label, value: value! }));

export const buildInvoiceViewModel = (
  invoice: FullInvoice,
  booking: FullBooking,
  transactions: Payment[],
  settings: Record<string, string>,
  { assetBase, heroImageUrl, photographerNames = [], now = new Date() }: BuildInvoiceViewModelOptions
): InvoiceViewModel => {
  const core = buildCore({
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt,
    subtotalP: invoice.lineItems.reduce((s, li) => s + paise(li.amount), 0),
    discountP: paise(invoice.discount),
    payments: transactions.filter((t) => t.status === 'SETTLED' || t.status === 'COMPLETED'),
    dueAt: booking.date,
    dueCaptions: ['Before event', 'On delivery'],
    termsKey: 'studio_terms',
    defaultTerms: DEFAULT_INVOICE_TERMS,
    settings,
    assetBase,
    now,
  });

  const inclusions = Array.isArray(booking.inclusions) ? booking.inclusions.filter((v): v is string => typeof v === 'string' && !!v.trim()) : [];
  const onlyPackageLine = invoice.lineItems.length === 1 && invoice.lineItems[0].description.endsWith(' Package');
  const items: InvoiceLineItemVM[] = invoice.lineItems.map((li) => {
    const [title, ...rest] = li.description.split('\n');
    const subtitle = text(rest.join(' ')) ?? (onlyPackageLine ? text([booking.packageName, inclusions.join(' · ')].filter(Boolean).join(' — ')) : undefined);
    return {
      title: title.trim(),
      subtitle,
      icon: itemIcon(li.description),
      qty: String(li.quantity),
      unitPrice: formatCurrency(num(li.rate)),
      total: formatCurrency(num(li.amount)),
    };
  });

  const venue = text(booking.location);
  const eventWhen = [formatDate(booking.date), text(booking.time)].filter(Boolean).join(', ') || undefined;
  const photographers = photographerNames.filter(Boolean).join(', ') || undefined;

  return {
    ...core,
    heroImageUrl: heroImageUrl ?? (STUDIO_DETAILS.showSamplePhotos ? core.assets.photoPlaceholder : undefined),
    billTo: {
      name: booking.client.name,
      lines: lines(['phone', text(booking.client.phone)], ['mail', text(booking.client.email)], ['calendar', formatDate(booking.date) && `Event date: ${formatDate(booking.date)}`], ['pin', venue && `Venue: ${venue}`]),
    },
    detailsTitle: 'EVENT INFORMATION',
    event: details([
      ['calendar', 'Event date', eventWhen],
      ['pin', 'Venue', venue],
      ['users', 'Package', text(booking.packageName) ?? text(booking.category && `${booking.category} package`)],
      ['camera', photographerNames.length > 1 ? 'Photographers' : 'Photographer', photographers],
    ]),
    items,
  };
};


/** Gift / frame order (ProductOrder) as the invoice the order screen agrees with. */
export interface OrderInvoiceInput {
  id: string;
  orderNumber: string | null;
  clientName: string;
  clientPhone: string | null;
  quantity: number;
  status: string;
  date: Date | string;
  createdAt: Date | string;
  dueDate: Date | string | null;
  discountAmount: unknown;
  customData: unknown;
  product: { name: string; description?: string | null };
  /** The order's payments (not deleted) */
  payments: { amount: unknown; date: Date | string }[];
}

/** "#MDorder-1F0974" → "MDorder-1F0974"; orders without a number get one from their id, like the app shows. */
export const orderNumberOf = (o: { id: string; orderNumber: string | null }) =>
  (o.orderNumber ?? `MDorder-${o.id.slice(-6).toUpperCase()}`).replace(/^#/, '');

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order placed',
  PROCESSING: 'In production',
  READY: 'Ready for pickup',
  DELIVERED: 'Delivered',
};

export const buildOrderInvoiceViewModel = (
  order: OrderInvoiceInput,
  settings: Record<string, string>,
  { assetBase, heroImageUrl, now = new Date() }: { assetBase: string; heroImageUrl?: string; now?: Date }
): InvoiceViewModel => {
  const custom = (order.customData && typeof order.customData === 'object' ? order.customData : {}) as Record<string, unknown>;
  // Same figures as the order screen: amount is the gross price; the discount comes off it
  const amountP = paise(custom.amount);
  const discountP = paise(order.discountAmount) || paise(custom.discountAmount);
  const number = orderNumberOf(order);
  const core = buildCore({
    invoiceNumber: number,
    invoiceDate: order.date ?? order.createdAt,
    subtotalP: amountP,
    discountP,
    payments: order.payments,
    dueAt: order.dueDate,
    dueCaptions: ['On delivery', 'On delivery'],
    termsKey: 'studio_order_terms',
    defaultTerms: DEFAULT_ORDER_TERMS,
    settings,
    assetBase,
    now,
  });
  const qty = Math.max(1, order.quantity || 1);
  const delivery = formatDate(order.dueDate);
  const status = order.status ? ORDER_STATUS_LABEL[order.status] ?? order.status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : undefined;

  return {
    ...core,
    heroImageUrl,
    billTo: {
      name: order.clientName,
      lines: lines(['phone', text(order.clientPhone)], ['calendar', formatDate(order.date) && `Ordered on ${formatDate(order.date)}`], ['clock', delivery && `Delivery by ${delivery}`]),
    },
    detailsTitle: 'ORDER INFORMATION',
    event: details([
      ['calendar', 'Order date', formatDate(order.date)],
      ['clock', 'Delivery date', delivery],
      ['package', 'Product', text(order.product.name)],
      ['image', 'Status', status],
    ]),
    items: amountP > 0 || order.product.name
      ? [{
          title: order.product.name,
          subtitle: text(order.product.description),
          icon: itemIcon(order.product.name),
          qty: String(qty),
          unitPrice: formatCurrency(rupees(Math.round(amountP / qty))),
          total: formatCurrency(rupees(amountP)),
        }]
      : [],
  };
};
