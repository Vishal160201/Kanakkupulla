import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, spacing, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconWrapper: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.secondaryText,
    flexShrink: 1,
  }
});

interface InfoRowProps {
  icon?: React.ReactNode;
  label?: string;
  value: string;
}

export const InfoRow = ({ icon, label, value }: InfoRowProps) => (
  <View style={styles.row}>
    {icon && <View style={styles.iconWrapper}>{icon}</View>}
    <Text style={styles.text}>
      {label ? `${label}: ` : ''}{value}
    </Text>
  </View>
);
