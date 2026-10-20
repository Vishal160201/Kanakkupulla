import { InvoiceStatus } from './invoiceStatus';
import { SummaryRow } from './summaryRow';
import { PaymentProgress } from './paymentProgress';
import type { InvoiceAssets } from '../utils/assetRegistry';

export interface InvoiceLineItemVM {
  description: string;
  qty: number;
  unitPrice: string;
  total: string;
}

export interface SummaryCardVariant {
  theme: 'dark' | 'success';
  title: string;
  amount: string;
  subLabel: string;
}

export interface InvoiceViewModel {
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  
  fromName: string;
  fromPhone: string;
  fromEmail: string;
  fromAddress: string;
  
  formattedInvoiceDate: string;
  formattedDueDate: string;
  
  eventDate: string;
  venue: string;
  packageName: string;
  photographers: string;
  
  status: InvoiceStatus;
  statusText: string;
  statusColor: string;
  
  heroImageUrl: string;
  qrCodeDataUrl: string;
  
  items: InvoiceLineItemVM[];
  
  summaryCardVariant: SummaryCardVariant;
  summaryRows: SummaryRow[];
  paymentProgress: PaymentProgress;
  
  footerMode: 'payment' | 'review';
  footerNotes: string[];
  
  socials: {
    instagram: string;
    website: string;
    phone: string;
    email: string;
  };
  
  /** Absolute URLs for static PDF assets, resolved against the app origin. */
  assets: InvoiceAssets;

  settings: Record<string, string>;
}
