import React from 'react';
import { View, Text, StyleSheet, Image as PdfImage } from '@react-pdf/renderer';
import { InvoiceViewModel } from '../types/invoiceViewModel';
import { colors, spacing, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 20,
    minHeight: 180,
  },
  heroImageWrapper: {
    position: 'absolute',
    top: -30,
    left: -40,
    width: 280, // matched to frame size
    height: 310,
    zIndex: 1,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  logoCol: {
    width: '30%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 20,
    marginLeft: 180, // push past the absolute image
  },
  logoIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
    position: 'absolute',
    top: 6,
    right: 12,
  },
  brandName: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    color: colors.primaryText,
  },
  brandSub: {
    fontFamily: typography.fontFamily,
    fontSize: 5,
    letterSpacing: 1.5,
    color: colors.secondaryText,
    marginTop: 2,
  },
  titleCol: {
    width: '35%',
    alignItems: 'center',
    paddingTop: 15,
  },
  invoiceTitle: {
    fontFamily: typography.serifFamily,
    fontSize: 42,
    color: colors.primaryText,
    letterSpacing: 6,
    marginBottom: 8,
  },
  decorativeLineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
  },
  decorativeLine: {
    height: 1,
    backgroundColor: colors.gold,
    width: 30,
  },
  decorativeDiamond: {
    width: 5,
    height: 5,
    backgroundColor: colors.gold,
    transform: 'rotate(45deg)',
    marginHorizontal: 8,
  },
  tagline: {
    fontFamily: typography.cursiveFamily,
    fontSize: 14,
    color: colors.primaryText,
    textAlign: 'center',
  },
  detailsCol: {
    width: '25%',
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  invoiceNumber: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xl,
    fontWeight: 700,
    color: colors.gold,
    marginBottom: spacing.md,
  },
  statusPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xxs,
    fontWeight: 700,
    letterSpacing: 1,
  },
  dateGrid: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  dateValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: 700,
    color: colors.primaryText,
    marginBottom: 8,
  },
});

interface HeaderProps {
  viewModel: InvoiceViewModel;
}

export const Header = ({ viewModel }: HeaderProps) => {
  let statusColor = colors.pendingOrange;
  if (viewModel.status === 'PAID') statusColor = colors.successGreen;
  if (viewModel.status === 'OVERDUE') statusColor = colors.overdueRed;

  return (
    <View style={styles.container}>
      <View style={styles.heroImageWrapper}>
        <PdfImage src={viewModel.heroImageUrl} style={styles.heroImage} />
        <PdfImage src={viewModel.assets.heroFrame} style={styles.heroFrame} />
      </View>

      <View style={styles.logoCol}>
        <View style={styles.logoIconWrapper}>
          <View style={styles.logoInnerDot} />
        </View>
        <Text style={styles.brandName}>MOONDOT</Text>
        <Text style={[styles.brandName, { fontSize: typography.sizes.xs, letterSpacing: 4 }]}>STUDIO</Text>
        <Text style={styles.brandSub}>CAPTURING YOUR MEMORIES</Text>
      </View>

      <View style={styles.titleCol}>
        <Text style={styles.invoiceTitle}>INVOICE</Text>
        <View style={styles.decorativeLineWrapper}>
          <View style={styles.decorativeLine} />
          <View style={styles.decorativeDiamond} />
          <View style={styles.decorativeLine} />
        </View>
        <Text style={styles.tagline}>Thank you for trusting us with your special moments.</Text>
      </View>

      <View style={styles.detailsCol}>
        <Text style={styles.invoiceNumber}>#{viewModel.invoiceNumber}</Text>
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{viewModel.status}</Text>
        </View>
        <View style={styles.dateGrid}>
          <Text style={styles.dateLabel}>Invoice Date</Text>
          <Text style={styles.dateValue}>{viewModel.formattedInvoiceDate}</Text>
          <Text style={styles.dateLabel}>Due Date</Text>
          <Text style={styles.dateValue}>{viewModel.formattedDueDate}</Text>
        </View>
      </View>
    </View>
  );
};
