import React from 'react';
import { View } from '@react-pdf/renderer';
import { colors } from '../theme/invoiceTheme';

export const ProgressBar = ({ percent, color = colors.gold }: { percent: number; color?: string }) => (
  <View style={{ height: 5, borderRadius: 3, backgroundColor: '#ECE6DC' }}>
    <View style={{ height: 5, borderRadius: 3, width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: color }} />
  </View>
);
