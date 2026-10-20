const ASSET_DIR = 'booking-invoice-assets';

export interface InvoiceAssets {
  baseUrl: string;
  floral: string;
  stamp: string;
  heroFrame: string;
  googleReview: string;
  texture: string;
  photoPlaceholder: string;
  // Not shipped in public/booking-invoice-assets yet; optional so nothing requests a missing file.
  logo?: string;
  photoMaskClip?: string;
}

/**
 * Builds absolute URLs for the static invoice assets. @react-pdf/renderer fetches
 * images server-side, so they must be absolute; `baseUrl` is the app origin
 * (e.g. process.env.NEXTAUTH_URL or the request origin).
 */
export const createInvoiceAssets = (baseUrl: string): InvoiceAssets => {
  const origin = baseUrl.replace(/\/+$/, '');
  const resolve = (filename: string) => `${origin}/${ASSET_DIR}/${filename}`;

  return {
    baseUrl: origin,
    floral: resolve('floralPartialPaid.png'),
    stamp: resolve('mdStamp.png'),
    heroFrame: resolve('bookingInvoice.png'),
    googleReview: resolve('google.png'),
    texture: resolve('floralFullyPaid.png'),
    photoPlaceholder: resolve('couple.png'),
  };
};
