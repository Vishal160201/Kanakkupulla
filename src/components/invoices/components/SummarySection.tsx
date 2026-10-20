import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoiceViewModel } from '../types/invoiceViewModel';
import { colors, typography, radius } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    color: colors.secondaryText,
  },
  labelDiscount: {
    color: colors.gold,
  },
  labelSuccess: {
    color: colors.successGreen,
  },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    fontWeight: 700,
    color: colors.primaryText,
    textAlign: 'right',
  },
  valueDiscount: {
    color: colors.gold,
  },
  valueSuccess: {
    color: colors.successGreen,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.goldLight,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: 700,
    color: colors.primaryText,
  },
  totalValue: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: 700,
    color: colors.gold,
  }
});

interface SummarySectionProps {
  viewModel: InvoiceViewModel;
}

export const SummarySection = ({ viewModel }: SummarySectionProps) => {
  return (
    <View style={styles.container}>
      {viewModel.summaryRows.filter(r => !r.isTotal).map((row, index) => {
        const isDiscount = row.label === 'Discount';
        const isSuccess = row.label === 'Amount Paid';
        return (
          <View key={index} style={styles.row}>
            <Text style={[
              styles.label,
              ...(isDiscount ? [styles.labelDiscount] : []),
              ...(isSuccess ? [styles.labelSuccess] : []),
            ]}>{row.label}</Text>
            <Text style={[
              styles.value,
              ...(isDiscount ? [styles.valueDiscount] : []),
              ...(isSuccess ? [styles.valueSuccess] : []),
            ]}>{row.value}</Text>
          </View>
        );
      })}
      
      {viewModel.summaryRows.filter(r => r.isTotal).map((row, index) => (
        <View key={index} style={styles.totalBox}>
          <Text style={styles.totalLabel}>{row.label}</Text>
          <Text style={styles.totalValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
};
