import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceStatus } from '../types/invoiceStatus';
import { Icon } from '../icons';
import { colors, typography } from '../theme/invoiceTheme';

/** Pending and partial share the brand gold; paid is green, overdue red. */
export const STATUS_COLOR: Record<InvoiceStatus, { fg: string; bg: string }> = {
  PENDING: { fg: colors.goldDeep, bg: colors.white },
  PARTIALLY_PAID: { fg: colors.goldDeep, bg: colors.white },
  PAID: { fg: colors.green, bg: colors.greenSoft },
  OVERDUE: { fg: colors.red, bg: colors.redSoft },
};

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
  label: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' },
});

export const StatusPill = ({ status, label }: { status: InvoiceStatus; label: string }) => {
  const { fg, bg } = STATUS_COLOR[status];
  return (
    <View style={[styles.pill, { borderColor: fg, backgroundColor: bg }]}>
      {status === 'PAID' ? (
        <View style={{ marginRight: 4 }}>
          <Icon name="checkCircle" color={fg} size={9} />
        </View>
      ) : (
        <View style={[styles.dot, { backgroundColor: fg }]} />
      )}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
};
