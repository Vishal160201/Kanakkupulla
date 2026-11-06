import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { InfoLine, InvoiceViewModel } from '../types/invoiceViewModel';
import type { GlyphName } from '../icons/glyphs';
import { Section } from '../ui/Section';
import { IconTile, InfoRow } from '../ui/InfoRow';
import { colors, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 4 },
  card: { flex: 1, flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 13 },
  body: { flex: 1, marginLeft: 11 },
  label: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700, letterSpacing: 1.2, color: colors.gold },
  name: { fontFamily: typography.sans, fontSize: 12, fontWeight: 700, color: colors.ink, marginTop: 3, marginBottom: 2, lineHeight: 1.25 },
});

const Party = ({ icon, label, name, lines }: { icon: GlyphName; label: string; name: string; lines: InfoLine[] }) => (
  <Section style={styles.card}>
    <IconTile icon={icon} />
    <View style={styles.body}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.name}>{name}</Text>
      {lines.map((l, i) => (
        <InfoRow key={i} icon={l.icon} text={l.text} />
      ))}
    </View>
  </Section>
);

export const BillingSection = ({ viewModel: vm }: { viewModel: InvoiceViewModel }) => (
  <View style={styles.row} wrap={false}>
    <Party icon="user" label="BILL TO" name={vm.billTo.name} lines={vm.billTo.lines} />
    <View style={{ width: 12 }} />
    <Party icon="camera" label="FROM" name={vm.from.name} lines={vm.from.lines} />
  </View>
);
