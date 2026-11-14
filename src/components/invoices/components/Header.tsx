import React from 'react';
import { View, Text, StyleSheet, Svg, Defs, ClipPath, Path, Image as SvgImage, Line, Polygon } from '@react-pdf/renderer';
import type { InvoiceViewModel } from '../types/invoiceViewModel';
import { StatusPill } from '../ui/StatusPill';
import { colors, typography } from '../theme/invoiceTheme';
import { STUDIO_DETAILS } from "@/lib/constants";

// The couple photo sits in the page's top-left corner with a sweeping right edge, outlined in gold.
const HERO_W = 140;
const HERO_H = 186;
const HERO_EDGE = 'M140 0 C137 38 125 74 101 103 C77 133 39 157 0 186';
const HERO_SHAPE = `M0 0 L140 0 ${HERO_EDGE.slice(HERO_EDGE.indexOf('C'))} Z`;

const styles = StyleSheet.create({

  // All three columns share one centre line, whatever their heights
  row: { flexDirection: 'row', alignItems: 'center', height: 140 },
  heroSpace: { width: 98 },
  brand: { width: 118, alignItems: 'center' },
  brandName: { fontFamily: typography.serif, fontSize: 15, letterSpacing: 2, color: colors.ink },
  brandStudio: { fontFamily: typography.sans, fontSize: 7, letterSpacing: 4, color: colors.gold, marginTop: 1 },
  brandTagline: { fontFamily: typography.sans, fontSize: 5.5, letterSpacing: 1.4, color: colors.muted, marginTop: 7, textTransform: 'uppercase' },
  title: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  titleText: { fontFamily: typography.serif, fontSize: 32, letterSpacing: 2, color: colors.ink },
  thanks: { fontFamily: typography.script, fontSize: 11.5, color: colors.gold, marginTop: 5, textAlign: 'center', lineHeight: 1.15 },
  meta: { width: 118, alignItems: 'flex-end' },
  metaLabel: { fontFamily: typography.sans, fontSize: 6.5, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase', marginTop: 8 },
  number: { fontFamily: typography.sans, fontSize: 14, fontWeight: 700, color: colors.gold, marginTop: 2, marginBottom: 6 },
  metaValue: { fontFamily: typography.sans, fontSize: 9, fontWeight: 700, color: colors.ink, marginTop: 2 },
});

const Ornament = () => (
  <Svg width={120} height={8} viewBox="0 0 120 8">
    <Line x1={6} y1={4} x2={52} y2={4} stroke={colors.gold} strokeWidth={0.7} />
    <Polygon points="60,0.5 63.5,4 60,7.5 56.5,4" fill={colors.gold} />
    <Line x1={68} y1={4} x2={114} y2={4} stroke={colors.gold} strokeWidth={0.7} />
  </Svg>
);

/** Placed at the page root so it reaches the page corner (outside the content padding). */
export const HeroPhoto = ({ src }: { src: string }) => (
  <Svg width={HERO_W + 4} height={HERO_H + 4} viewBox={`0 0 ${HERO_W + 4} ${HERO_H + 4}`}>
    <Defs>
      <ClipPath id="hero">
        <Path d={HERO_SHAPE} />
      </ClipPath>
    </Defs>
    {/* Inside <Svg>, react-pdf's Image takes src + style size; x/y/clipPath aren't in its types */}
    <SvgImage src={src} style={{ width: HERO_W, height: HERO_H }} {...({ x: 0, y: 0, clipPath: 'url(#hero)' } as object)} />
    <Path d={HERO_EDGE} stroke={colors.gold} strokeWidth={2.2} fill="none" />
  </Svg>
);

export const Header = ({ viewModel: vm }: { viewModel: InvoiceViewModel }) => {
  const hasPhoto = !!vm.heroImageUrl;
  // Long numbers (MDorder-1F0974) step down so they stay on one line
  const numberSize = vm.invoiceNumber.length > 10 ? 12 : 14;
  return (
    <View style={styles.row}>
      {hasPhoto && <View style={styles.heroSpace} />}
      <View style={[styles.brand, hasPhoto ? {} : { alignItems: 'flex-start' }]}>
        <Text style={styles.brandName}>{STUDIO_DETAILS.wordmark[0].toUpperCase()}</Text>
        <Text style={styles.brandStudio}>{STUDIO_DETAILS.wordmark[1].toUpperCase()}</Text>
        <Text style={styles.brandTagline}>{vm.studio.tagline}</Text>
      </View>
      <View style={styles.title}>
        <Text style={styles.titleText}>INVOICE</Text>
        <View style={{ marginTop: 6 }}>
          <Ornament />
        </View>
        <Text style={styles.thanks}>{vm.status === 'PAID' ? 'Thank you for trusting us!' : 'Thank you for trusting us with your special moments.'}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.metaLabel, { marginTop: 0 }]}>Invoice no.</Text>
        <Text style={[styles.number, { fontSize: numberSize }]}>{vm.invoiceNumber}</Text>
        <StatusPill status={vm.status} label={vm.statusLabel} />
        <Text style={styles.metaLabel}>Invoice date</Text>
        <Text style={styles.metaValue}>{vm.invoiceDate}</Text>
      </View>
    </View>
  );
};
