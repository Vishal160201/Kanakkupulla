import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoiceStatus } from '../types/invoiceStatus';
import { colors, radius, spacing, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  pill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: 700,
  }
});

const getStatusStyles = (status: InvoiceStatus) => {
  switch (status) {
    case 'PAID':
      return { bg: '#D1FAE5', text: colors.successGreen, label: 'PAID' };
    case 'OVERDUE':
      return { bg: '#FEE2E2', text: colors.overdueRed, label: 'OVERDUE' };
    case 'PARTIALLY_PAID':
      return { bg: '#FEF3C7', text: colors.pendingOrange, label: 'PARTIALLY PAID' };
    case 'PENDING':
    default:
      return { bg: '#FEF3C7', text: colors.pendingOrange, label: 'PENDING' };
  }
};

interface StatusPillProps {
  status: InvoiceStatus;
}

export const StatusPill = ({ status }: StatusPillProps) => {
  const { bg, text, label } = getStatusStyles(status);
  
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};
