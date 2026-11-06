import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceViewModel } from '../types/invoiceViewModel';
import { Section } from '../ui/Section';
import { IconTile } from '../ui/InfoRow';
import { colors, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  card: { marginTop: 8, paddingVertical: 9, paddingHorizontal: 12 },
  title: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4, color: colors.gold, textAlign: 'center', marginBottom: 7 },
  row: { flexDirection: 'row' },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  divider: { borderLeftWidth: 1, borderLeftColor: colors.rule },
  text: { flex: 1, marginLeft: 7 },
  label: { fontFamily: typography.sans, fontSize: 6, fontWeight: 700, letterSpacing: 0.9, color: colors.muted, textTransform: 'uppercase' },
  value: { fontFamily: typography.sans, fontSize: 8, color: colors.ink, marginTop: 2, lineHeight: 1.3 },
});

export const EventInformation = ({ viewModel: vm }: { viewModel: InvoiceViewModel }) => {
  if (vm.event.length === 0) return null;
  return (
    <Section style={styles.card}>
      <Text style={styles.title}>{vm.detailsTitle}</Text>
      <View style={styles.row}>
        {vm.event.map((e, i) => (
          <View key={e.label} style={[styles.item, { flex: e.icon === 'pin' ? 1.45 : 1 }, i > 0 ? styles.divider : {}]}>
            <IconTile icon={e.icon} size={24} />
            <View style={styles.text}>
              <Text style={styles.label}>{e.label}</Text>
              <Text style={styles.value}>{e.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
};
