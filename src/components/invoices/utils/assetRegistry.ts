// PDF-sized copies of the artwork (public/booking-invoice-assets/pdf/); the originals are several MB each.
const ASSET_DIR = 'booking-invoice-assets/pdf';

export interface InvoiceAssets {
  stamp: string;
  floralSprig: string;
  floralCorner: string;
  google: string;
  photoPlaceholder: string;
}

/**
 * Asset locations for @react-pdf/renderer, which loads images while rendering on the server:
 * `base` is an absolute origin (https://…) or a local folder path (the public/ directory).
 */
export const createInvoiceAssets = (base: string): InvoiceAssets => {
  const root = base.replace(/\/+$/, '');
  const resolve = (file: string) => `${root}/${ASSET_DIR}/${file}`;
  return {
    stamp: resolve('stamp.png'),
    floralSprig: resolve('floral-sprig.png'),
    floralCorner: resolve('floral-corner.png'),
    google: resolve('google.png'),
    photoPlaceholder: resolve('couple.jpg'),
  };
};
