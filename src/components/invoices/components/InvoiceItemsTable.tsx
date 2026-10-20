import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoiceViewModel } from '../types/invoiceViewModel';
import { colors, typography, radius } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  table: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.darkBox,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  thDesc: { flex: 5, color: '#FFFFFF', fontSize: typography.sizes.xs, fontWeight: 700, letterSpacing: 1.5 },
  thQty: { flex: 1, color: '#FFFFFF', fontSize: typography.sizes.xs, fontWeight: 700, letterSpacing: 1.5, textAlign: 'center' },
  thPrice: { flex: 2, color: '#FFFFFF', fontSize: typography.sizes.xs, fontWeight: 700, letterSpacing: 1.5, textAlign: 'right' },
  thTotal: { flex: 2, color: '#FFFFFF', fontSize: typography.sizes.xs, fontWeight: 700, letterSpacing: 1.5, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  tdDescBox: {
    flex: 5,
    flexDirection: 'column',
    justifyContent: 'center',
    flexShrink: 1,
  },
  tdDescTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: 600,
    color: colors.primaryText,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  tdQty: { flex: 1, fontSize: typography.sizes.sm, color: colors.secondaryText, textAlign: 'center' },
  tdPrice: { flex: 2, fontSize: typography.sizes.sm, color: colors.secondaryText, textAlign: 'right' },
  tdTotal: { flex: 2, fontSize: typography.sizes.sm, color: colors.secondaryText, textAlign: 'right' },
});

interface InvoiceItemsTableProps {
  viewModel: InvoiceViewModel;
}

export const InvoiceItemsTable = ({ viewModel }: InvoiceItemsTableProps) => (
  <View style={styles.container}>
    <View style={styles.table}>
      <View style={styles.tableHeaderRow} fixed>
        <Text style={styles.thDesc}>DESCRIPTION</Text>
        <Text style={styles.thQty}>QTY</Text>
        <Text style={styles.thPrice}>UNIT PRICE</Text>
        <Text style={styles.thTotal}>TOTAL</Text>
      </View>
      {viewModel.items.map((item, index) => (
        <View key={index} style={[styles.tableRow, index === viewModel.items.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
          <View style={styles.tdDescBox}>
            <Text style={styles.tdDescTitle}>{item.description}</Text>
          </View>
          <Text style={styles.tdQty}>{item.qty}</Text>
          <Text style={styles.tdPrice}>{item.unitPrice}</Text>
          <Text style={styles.tdTotal}>{item.total}</Text>
        </View>
      ))}
    </View>
  </View>
);
