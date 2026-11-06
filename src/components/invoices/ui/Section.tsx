import React from 'react';
import { View, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { colors, radius } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md },
});

/** The white rounded card every block sits in. */
export const Section = ({ children, style, wrap = false }: { children: React.ReactNode; style?: Style | Style[]; wrap?: boolean }) => (
  <View style={[styles.card, ...(Array.isArray(style) ? style : style ? [style] : [])]} wrap={wrap}>
    {children}
  </View>
);
