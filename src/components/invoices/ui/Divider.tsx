import React from 'react';
import { View, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { colors, spacing } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    width: '100%',
  }
});

interface DividerProps {
  style?: Style;
}

export const Divider = ({ style }: DividerProps) => (
  <View style={style ? [styles.divider, style] : [styles.divider]} />
);
