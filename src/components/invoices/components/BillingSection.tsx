import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoiceViewModel } from '../types/invoiceViewModel';
import { InfoRow } from '../ui/InfoRow';
import { UserIcon, CameraIcon, PhoneIcon, MailIcon, LocationIcon } from '../icons';
import { colors, spacing, typography, radius } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  cardWrapper: {
    width: '48%',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: 700,
    color: colors.gold,
    letterSpacing: 1.5,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: 700,
    color: colors.primaryText,
    marginBottom: 12,
  },
  infoWrapper: {
    flexShrink: 1,
  }
});

interface BillingSectionProps {
  viewModel: InvoiceViewModel;
}

export const BillingSection = ({ viewModel }: BillingSectionProps) => (
  <View style={styles.container}>
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <UserIcon color={colors.gold} size={10} />
          </View>
          <Text style={styles.cardTitle}>BILL TO</Text>
        </View>
        <Text style={styles.name}>{viewModel.clientName}</Text>
        <View style={styles.infoWrapper}>
          <InfoRow icon={<PhoneIcon color={colors.secondaryText} size={9} />} value={viewModel.clientPhone} />
          <InfoRow icon={<MailIcon color={colors.secondaryText} size={9} />} value={viewModel.clientEmail} />
          <InfoRow icon={<LocationIcon color={colors.secondaryText} size={9} />} value={`Event Date: ${viewModel.eventDate}`} />
          <InfoRow icon={<LocationIcon color={colors.secondaryText} size={9} />} value={`Venue: ${viewModel.venue}`} />
        </View>
      </View>
    </View>
    
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <CameraIcon color={colors.gold} size={10} />
          </View>
          <Text style={styles.cardTitle}>FROM</Text>
        </View>
        <Text style={styles.name}>{viewModel.fromName}</Text>
        <View style={styles.infoWrapper}>
          <InfoRow icon={<LocationIcon color={colors.secondaryText} size={9} />} value={viewModel.fromAddress} />
          <InfoRow icon={<LocationIcon color={colors.secondaryText} size={9} />} value={'GSTIN: 32ABCDE1234F1Z5'} />
          <InfoRow icon={<PhoneIcon color={colors.secondaryText} size={9} />} value={viewModel.fromPhone} />
          <InfoRow icon={<MailIcon color={colors.secondaryText} size={9} />} value={viewModel.fromEmail} />
        </View>
      </View>
    </View>
  </View>
);
