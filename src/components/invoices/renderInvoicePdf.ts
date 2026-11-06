import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import InvoiceDocument from './InvoiceDocument';
import { initFonts } from './theme/invoiceTheme';
import type { InvoiceViewModel } from './types/invoiceViewModel';

/** Adds the UPI QR (pre-filled with the balance and invoice number) and renders the invoice PDF. */
export async function renderInvoicePdf(viewModel: InvoiceViewModel): Promise<Buffer> {
  if (viewModel.payment?.upiId) {
    const upi = new URLSearchParams({ pa: viewModel.payment.upiId, pn: viewModel.studio.name, cu: 'INR', tn: `Invoice ${viewModel.invoiceNumber}` });
    if (viewModel.balanceDueAmount > 0) upi.set('am', viewModel.balanceDueAmount.toFixed(2));
    viewModel.payment.qrCodeDataUrl = await QRCode.toDataURL(`upi://pay?${upi.toString()}`, { margin: 1, width: 240 });
  }
  initFonts();
  return renderToBuffer(InvoiceDocument({ viewModel }));
}
