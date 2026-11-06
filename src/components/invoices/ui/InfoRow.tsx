import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Icon } from '../icons';
import type { GlyphName } from '../icons/glyphs';
import { colors, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  icon: { width: 14, paddingTop: 1 },
  text: { flex: 1, fontFamily: typography.sans, fontSize: 8.5, color: colors.text, lineHeight: 1.35 },
  tile: { backgroundColor: colors.tile, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});

/** Icon + text line (text wraps inside the card). */
export const InfoRow = ({ icon, text }: { icon: GlyphName; text: string }) => (
  <View style={styles.row}>
    <View style={styles.icon}>
      <Icon name={icon} color={colors.muted} size={9} />
    </View>
    <Text style={styles.text}>{text}</Text>
  </View>
);

/** Round cream tile with a gold icon, as in the card headers. */
export const IconTile = ({ icon, size = 30, color = colors.gold }: { icon: GlyphName; size?: number; color?: string }) => (
  <View style={[styles.tile, { width: size, height: size }]}>
    <Icon name={icon} color={color} size={size * 0.5} />
  </View>
);
