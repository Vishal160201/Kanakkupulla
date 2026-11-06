import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceViewModel } from '../types/invoiceViewModel';
import type { SummaryRow } from '../types/summaryRow';
import { Section } from '../ui/Section';
import { Icon } from '../icons';
import { PaymentProgress } from './PaymentProgress';
import { colors, radius, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 8 },
  money: { flexDirection: 'row', width: '56%', overflow: 'hidden' },
  amount: { width: '47%', padding: 14, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: radius.md - 1, borderBottomLeftRadius: radius.md - 1 },
  amountTitle: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  rupee: { fontFamily: typography.sans, fontSize: 20, fontWeight: 600, marginBottom: 3, marginRight: 1 },
  amountDigits: { fontFamily: typography.serif, fontSize: 27 },
  amountNote: { fontFamily: typography.sans, fontSize: 7.5, marginTop: 9, paddingTop: 8, borderTopWidth: 1, width: '85%', textAlign: 'center' },
  totals: { flex: 1, paddingVertical: 9, paddingHorizontal: 12, justifyContent: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  lineLabel: { fontFamily: typography.sans, fontSize: 8.5, color: colors.text },
  lineValue: { fontFamily: typography.sans, fontSize: 8.5, fontWeight: 600, color: colors.ink },
  balance: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.sm, paddingVertical: 7, paddingHorizontal: 9, marginTop: 6 },
  balanceLabel: { fontFamily: typography.sans, fontSize: 9, fontWeight: 700, color: colors.ink },
  balanceValue: { fontFamily: typography.sans, fontSize: 12, fontWeight: 700 },
  progress: { flex: 1, marginLeft: 10, paddingVertical: 10, paddingHorizontal: 12 },
  check: { flexDirection: 'row', alignItems: 'center' },
  paidThanks: { fontFamily: typography.sans, fontSize: 7.5, color: colors.text, marginTop: 5, textAlign: 'center' },
  paidNote: { fontFamily: typography.script, fontSize: 13, color: colors.green, marginTop: 4 },
});

const TONE: Record<string, string> = { discount: colors.goldDeep, paid: colors.green };

const Totals = ({ rows, balance, paid }: { rows: SummaryRow[]; balance: string; paid: boolean }) => (
  <View style={styles.totals}>
    {rows.map((r) => (
      <View key={r.label} style={[styles.line, r.tone === 'strong' ? { borderTopWidth: 1, borderTopColor: colors.rule, marginTop: 2, paddingTop: 5 } : {}]}>
        <Text style={[styles.lineLabel, r.tone && TONE[r.tone] ? { color: TONE[r.tone] } : {}, r.tone === 'strong' ? { fontWeight: 700 } : {}]}>{r.label}</Text>
        <Text style={[styles.lineValue, r.tone && TONE[r.tone] ? { color: TONE[r.tone] } : {}]}>{r.value}</Text>
      </View>
    ))}
    <View style={[styles.balance, { backgroundColor: paid ? colors.greenSoft : colors.goldSoft }]}>
      <Text style={styles.balanceLabel}>{paid ? 'Balance' : 'Balance due'}</Text>
      <Text style={[styles.balanceValue, { color: paid ? colors.green : colors.goldDeep }]}>{balance}</Text>
    </View>
  </View>
);

/** ₹ in Inter (Playfair has no rupee glyph) next to Playfair digits. */
const BigAmount = ({ digits, color }: { digits: string; color: string }) => (
  <View style={styles.amountRow}>
    <Text style={[styles.rupee, { color }]}>₹</Text>
    <Text style={[styles.amountDigits, { color }]}>{digits}</Text>
  </View>
);

export const SummarySection = ({ viewModel: vm }: { viewModel: InvoiceViewModel }) => {
  const card = vm.amountCard;
  if (card.tone === 'paid') {
    return (
      <Section style={[styles.row, { overflow: 'hidden' }]}>
        <View style={[styles.amount, { width: '50%', backgroundColor: colors.greenSoft, paddingVertical: 16 }]}>
          <View style={styles.check}>
            <Icon name="checkCircle" color={colors.green} size={11} />
            <Text style={[styles.amountTitle, { color: colors.green, marginLeft: 5 }]}>Payment completed</Text>
          </View>
          <Text style={styles.paidThanks}>Thank you! Your payment has been received.</Text>
          <Text style={[styles.amountTitle, { color: colors.muted, fontSize: 6.5, marginTop: 10 }]}>{card.title}</Text>
          <BigAmount digits={card.amount} color={colors.green} />
          <Text style={styles.paidNote}>{card.note}</Text>
        </View>
        <Totals rows={vm.summaryRows} balance={vm.balanceDue} paid />
      </Section>
    );
  }

  const overdue = card.tone === 'overdue';
  return (
    <View style={styles.row} wrap={false}>
      <Section style={styles.money}>
        <View style={[styles.amount, { backgroundColor: colors.dark }]}>
          <Text style={[styles.amountTitle, { color: overdue ? '#F0A290' : colors.gold }]}>{card.title}</Text>
          <BigAmount digits={card.amount} color={overdue ? '#F0A290' : colors.gold} />
          <Text style={[styles.amountNote, { color: colors.darkText, borderTopColor: '#3D3A35' }]}>{card.note}</Text>
        </View>
        <Totals rows={vm.summaryRows} balance={vm.balanceDue} paid={false} />
      </Section>
      <Section style={styles.progress}>
        <PaymentProgress progress={vm.paymentProgress} overdue={overdue} />
      </Section>
    </View>
  );
};
