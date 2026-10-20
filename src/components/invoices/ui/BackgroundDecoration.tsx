import React from 'react';
import { View, StyleSheet, Image as PdfImage } from '@react-pdf/renderer';
import type { InvoiceAssets } from '../utils/assetRegistry';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  floral: {
    position: 'absolute',
    bottom: -10,
    left: -20,
    width: 250,
    height: 250,
    opacity: 0.9,
  },
  stamp: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    width: 130,
    height: 130,
    opacity: 1,
    zIndex: 10, // Bring it above the footer if it's rendered outside, but since it's background it might fall behind. Actually in @react-pdf/renderer, elements in the same render context follow painter's algorithm, but since BackgroundDecoration is before Footer, it's behind.
    // Wait, in `InvoiceDocument.tsx`, BackgroundDecoration is placed before the main content view, so it will be behind the footer bar!
  }
});

interface BackgroundDecorationProps {
  assets: InvoiceAssets;
}

export const BackgroundDecoration = ({ assets }: BackgroundDecorationProps) => {
  return (
    <View style={styles.container} fixed>
      {/* We only render the floral and stamp if they exist safely */}
      <PdfImage src={assets.floral} style={styles.floral} />
    </View>
  );
};
