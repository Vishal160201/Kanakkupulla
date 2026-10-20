import React from 'react';
import { View, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { colors, radius, spacing } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  }
});

interface CardProps {
  children: React.ReactNode;
  style?: Style;
  wrap?: boolean;
}

export const Card = ({ children, style, wrap = true }: CardProps) => (
  <View style={style ? [styles.card, style] : [styles.card]} wrap={wrap}>
    {children}
  </View>
);
