import React from 'react';
import { View, Image as PdfImage } from '@react-pdf/renderer';
import type { InvoiceAssets } from '../utils/assetRegistry';

/** Faint floral sprig behind the lower-left of every page. Pure decoration. */
export const BackgroundDecoration = ({ assets }: { assets: InvoiceAssets }) => (
  <View fixed style={{ position: 'absolute', left: -14, bottom: 46, width: 118, height: 255, opacity: 0.5 }}>
    <PdfImage src={assets.floralSprig} style={{ width: 118, height: 255 }} />
  </View>
);
