import React from 'react';
import { View, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    paddingHorizontal: 40,
  }
});

interface SectionProps {
  children: React.ReactNode;
  style?: Style;
  wrap?: boolean;
}

export const Section = ({ children, style, wrap = true }: SectionProps) => (
  <View style={style ? [styles.section, style] : [styles.section]} wrap={wrap}>
    {children}
  </View>
);
