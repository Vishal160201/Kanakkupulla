import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceLineItemVM, InvoiceViewModel } from '../types/invoiceViewModel';
import { Icon } from '../icons';
import { INVOICE_CONSTANTS } from '../theme/constants';
import { colors, radius, typography } from '../theme/invoiceTheme';

const COL = { desc: 5.4, qty: 1.1, price: 2, total: 2 };

const styles = StyleSheet.create({
  table: { marginTop: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, overflow: 'hidden' },
  head: { flexDirection: 'row', backgroundColor: colors.dark, paddingVertical: 7 },
  headText: { fontFamily: typography.sans, fontSize: 7, fontWeight: 700, letterSpacing: 1, color: colors.darkText },
  row: { flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: colors.rule },
  cell: { justifyContent: 'center', paddingVertical: 5.5, paddingHorizontal: 10 },
  sep: { borderLeftWidth: 1, borderLeftColor: colors.rule },
  desc: { flexDirection: 'row', alignItems: 'center' },
  title: { fontFamily: typography.sans, fontSize: 9, fontWeight: 600, color: colors.ink, lineHeight: 1.3 },
  subtitle: { fontFamily: typography.sans, fontSize: 7, color: colors.muted, marginTop: 2, lineHeight: 1.3 },
  num: { fontFamily: typography.sans, fontSize: 9, color: colors.text },
  empty: { fontFamily: typography.sans, fontSize: 8.5, color: colors.muted, textAlign: 'center', paddingVertical: 14 },
});

const Head = () => (
  <View style={styles.head}>
    <Text style={[styles.headText, { flex: COL.desc, paddingLeft: 36 }]}>DESCRIPTION</Text>
    <Text style={[styles.headText, { flex: COL.qty, textAlign: 'center' }]}>QTY</Text>
    <Text style={[styles.headText, { flex: COL.price, textAlign: 'center' }]}>UNIT PRICE</Text>
    <Text style={[styles.headText, { flex: COL.total, textAlign: 'center' }]}>TOTAL</Text>
  </View>
);

const Row = ({ item, index }: { item: InvoiceLineItemVM; index: number }) => (
  <View style={[styles.row, index % 2 === 1 ? { backgroundColor: colors.zebra } : {}]} wrap={false}>
    <View style={[styles.cell, { flex: COL.desc }]}>
      <View style={styles.desc}>
        <View style={{ width: 26 }}>
          <Icon name={item.icon} color={colors.gold} size={12} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          {item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}
        </View>
      </View>
    </View>
    <View style={[styles.cell, styles.sep, { flex: COL.qty, alignItems: 'center' }]}>
      <Text style={styles.num}>{item.qty}</Text>
    </View>
    <View style={[styles.cell, styles.sep, { flex: COL.price, alignItems: 'center' }]}>
      <Text style={styles.num}>{item.unitPrice}</Text>
    </View>
    <View style={[styles.cell, styles.sep, { flex: COL.total, alignItems: 'center' }]}>
      <Text style={[styles.num, { fontWeight: 600, color: colors.ink }]}>{item.total}</Text>
    </View>
  </View>
);

/** Long invoices continue on the next page as a new table with the header repeated; rows never split. */
export const InvoiceItemsTable = ({ viewModel: vm }: { viewModel: InvoiceViewModel }) => {
  const { firstPageRows, rowsPerPage } = INVOICE_CONSTANTS;
  const chunks: InvoiceLineItemVM[][] = [vm.items.slice(0, firstPageRows)];
  for (let i = firstPageRows; i < vm.items.length; i += rowsPerPage) chunks.push(vm.items.slice(i, i + rowsPerPage));

  return (
    <>
      {chunks.map((rows, c) => (
        <View key={c} style={styles.table} break={c > 0} wrap={false}>
          <Head />
          {rows.length === 0 ? (
            <Text style={styles.empty}>No items on this invoice yet.</Text>
          ) : (
            rows.map((item, i) => <Row key={i} item={item} index={c === 0 ? i : firstPageRows + (c - 1) * rowsPerPage + i} />)
          )}
        </View>
      ))}
    </>
  );
};
