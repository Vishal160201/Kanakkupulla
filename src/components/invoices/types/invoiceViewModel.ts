import type { InvoiceStatus } from './invoiceStatus';
import type { SummaryRow } from './summaryRow';
import type { PaymentProgress } from './paymentProgress';
import type { InvoiceAssets } from '../utils/assetRegistry';
import type { GlyphName } from '../icons/glyphs';

/** One icon + text line; blank values are dropped before they get here. */
export interface InfoLine {
  icon: GlyphName;
  text: string;
}

export interface InvoiceLineItemVM {
  title: string;
  subtitle?: string;
  icon: GlyphName;
  qty: string;
  unitPrice: string;
  total: string;
}

export interface EventDetail {
  icon: GlyphName;
  label: string;
  value: string;
}

/** Big amount card: amount is digits only ("30,000"); the ₹ sign is drawn in a font that has it. */
export interface AmountCard {
  tone: 'due' | 'overdue' | 'paid';
  title: string;
  amount: string;
  note: string;
}

export interface PaymentMethods {
  upiId?: string;
  /** PNG data URL of a UPI QR that pre-fills the balance; set by the PDF route */
  qrCodeDataUrl?: string;
  bank?: { accountName?: string; accountNumber: string; ifsc: string; bankName?: string };
  whatsapp?: { phone: string; link: string };
}

export interface InvoiceViewModel {
  invoiceNumber: string;
  status: InvoiceStatus;
  statusLabel: string;
  invoiceDate: string;

  /** Photo for the header corner (couple photo / order reference image), cropped to the frame; floral artwork without one */
  heroImageUrl?: string;

  studio: { name: string; tagline: string };
  billTo: { name: string; lines: InfoLine[] };
  from: { name: string; lines: InfoLine[] };
  /** Title of the details card ("EVENT INFORMATION" / "ORDER INFORMATION") */
  detailsTitle: string;
  event: EventDetail[];

  items: InvoiceLineItemVM[];
  /** Subtotal, discount, total, paid… (pre-formatted, zero rows left out) */
  summaryRows: SummaryRow[];
  balanceDue: string;
  /** Unformatted balance, for the UPI QR amount */
  balanceDueAmount: number;
  amountCard: AmountCard;
  paymentProgress: PaymentProgress;

  payment?: PaymentMethods;
  review?: { url?: string };
  terms: string[];
  contacts: InfoLine[];

  assets: InvoiceAssets;
  meta: { title: string; subject: string; keywords: string; templateVersion: string };
}
