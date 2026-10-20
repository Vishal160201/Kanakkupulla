import React from 'react';
import { View, StyleSheet } from '@react-pdf/renderer';
import { colors, radius } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  container: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: radius.full,
    width: '100%',
    flexDirection: 'row',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  }
});

interface ProgressBarProps {
  percent: number;
  color?: string;
}

export const ProgressBar = ({ percent, color = colors.pendingOrange }: ProgressBarProps) => {
  const safePercent = Math.min(Math.max(percent, 0), 100);
  
  return (
    <View style={styles.container}>
      <View style={[styles.fill, { width: `${safePercent}%`, backgroundColor: color }]} />
    </View>
  );
};
