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
import { DEFAULT_INVOICE_TERMS } from '@/lib/invoiceSettings';

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

export const buildInvoiceViewModel = (
  invoice: FullInvoice,
  booking: FullBooking,
  transactions: Payment[],
  settings: Record<string, string>,
  { assetBase, heroImageUrl, photographerNames = [], now = new Date() }: BuildInvoiceViewModelOptions
): InvoiceViewModel => {
  const assets = createInvoiceAssets(assetBase);
  const setting = (key: string) => text(settings[key]);

  // ---- Money (in paise) ----
  const subtotalP = invoice.lineItems.reduce((s, li) => s + paise(li.amount), 0);
  const discountP = Math.min(Math.max(paise(invoice.discount), 0), subtotalP);
  const totalP = subtotalP - discountP;
  const settled = transactions
    .filter((t) => t.status === 'SETTLED' || t.status === 'COMPLETED')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const paidP = settled.reduce((s, t) => s + paise(t.amount), 0);
  const balanceP = Math.max(totalP - paidP, 0);
  const overpaidP = Math.max(paidP - totalP, 0);

  // ---- Status ----
  const eventDate = new Date(booking.date);
  const eventPassed = !Number.isNaN(eventDate.getTime()) && now > eventDate;
  let status: InvoiceStatus = 'PENDING';
  if (balanceP === 0 && totalP > 0) status = 'PAID';
  else if (paidP > 0 && balanceP > 0) status = 'PARTIALLY_PAID';
  else if (eventPassed && balanceP > 0) status = 'OVERDUE';

  const summaryRows: SummaryRow[] = [{ label: 'Subtotal', value: formatCurrency(rupees(subtotalP)) }];
  if (discountP > 0) summaryRows.push({ label: 'Discount', value: `- ${formatCurrency(rupees(discountP))}`, tone: 'discount' });
  if (discountP > 0 && paidP > 0) summaryRows.push({ label: 'Total', value: formatCurrency(rupees(totalP)), tone: 'strong' });
  if (paidP > 0) summaryRows.push({ label: 'Amount paid', value: `- ${formatCurrency(rupees(Math.min(paidP, totalP)))}`, tone: 'paid' });
  if (overpaidP > 0) summaryRows.push({ label: 'Overpaid', value: formatCurrency(rupees(overpaidP)), tone: 'paid' });

  const dueDate = formatDate(booking.date);
  const amountCard: AmountCard =
    status === 'PAID'
      ? { tone: 'paid', title: 'Total amount', amount: formatAmountDigits(rupees(totalP)), note: overpaidP > 0 ? `Overpaid by ${formatCurrency(rupees(overpaidP))}` : 'Paid in full' }
      : status === 'OVERDUE'
        ? { tone: 'overdue', title: 'Amount overdue', amount: formatAmountDigits(rupees(balanceP)), note: dueDate ? `Was due on ${dueDate}` : 'Payment overdue' }
        : { tone: 'due', title: 'Amount due', amount: formatAmountDigits(rupees(balanceP)), note: 'Balance to be paid' };

  const steps = buildPaymentSteps(
    settled.map((t) => ({ amount: rupees(paise(t.amount)), date: new Date(t.date) })),
    rupees(balanceP),
    eventPassed ? 'On delivery' : 'Before event',
    status === 'OVERDUE'
  );

  // ---- Line items ----
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

  // ---- People and event ----
  const studioName = setting('studio_name') ?? STUDIO_DETAILS.name;
  const studioPhone = setting('studio_phone') ?? STUDIO_DETAILS.phone;
  const studioEmail = setting('studio_email') ?? STUDIO_DETAILS.email;
  const venue = text(booking.location);
  const eventWhen = [formatDate(booking.date), text(booking.time)].filter(Boolean).join(', ') || undefined;
  const photographers = photographerNames.filter(Boolean).join(', ') || undefined;
  const event: EventDetail[] = (
    [
      ['calendar', 'Event date', eventWhen],
      ['pin', 'Venue', venue],
      ['users', 'Package', text(booking.packageName) ?? text(booking.category && `${booking.category} package`)],
      ['camera', photographerNames.length > 1 ? 'Photographers' : 'Photographer', photographers],
    ] as [GlyphName, string, string | undefined][]
  )
    .filter((e) => !!e[2])
    .map(([icon, label, value]) => ({ icon, label, value: value! }));

  // ---- Payment methods (unpaid invoices only) ----
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
            link: `https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}?text=${encodeURIComponent(`Hi, sharing the payment for invoice ${invoice.invoiceNumber} (${formatCurrency(rupees(balanceP))}).`)}`,
          }
        : undefined,
    };
  }

  const terms = setting('studio_terms')?.split('\n').map((t) => t.trim()).filter(Boolean) ?? DEFAULT_INVOICE_TERMS;
  const meta = getPdfMetadata(invoice.invoiceNumber);

  return {
    invoiceNumber: invoice.invoiceNumber,
    status,
    statusLabel: STATUS_LABEL[status],
    invoiceDate: formatDate(invoice.createdAt) ?? '',
    dueDate: status === 'PAID' ? undefined : dueDate,
    heroImageUrl: heroImageUrl ?? assets.photoPlaceholder,
    studio: { name: studioName, tagline: setting('studio_tagline') ?? 'Capturing your memories' },
    billTo: {
      name: booking.client.name,
      lines: lines(['phone', text(booking.client.phone)], ['mail', text(booking.client.email)], ['calendar', formatDate(booking.date) && `Event date: ${formatDate(booking.date)}`], ['pin', venue && `Venue: ${venue}`]),
    },
    from: {
      name: studioName,
      lines: lines(['pin', setting('studio_address') ?? STUDIO_DETAILS.address], ['file', setting('studio_gstin') && `GSTIN: ${setting('studio_gstin')}`], ['phone', studioPhone], ['mail', studioEmail]),
    },
    event,
    items,
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
    terms,
    contacts: lines(
      ['instagram', setting('studio_instagram') ?? 'instagram.com/moondot.studio'],
      ['globe', setting('studio_website') ?? 'www.moondotstudio.com'],
      ['phone', studioPhone],
      ['mail', studioEmail]
    ),
    assets,
    meta: { title: meta.title, subject: meta.subject, keywords: meta.keywords, templateVersion: INVOICE_CONSTANTS.templateVersion },
  };
};
