import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoiceViewModel } from '../types/invoiceViewModel';
import { CalendarIcon, LocationIcon, PackageIcon, CameraIcon } from '../icons';
import { colors, typography, radius } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 10,
  },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
  },
  titleWrapper: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  titleText: {
    backgroundColor: colors.background, // match page background so the border line is cleanly cut
    paddingHorizontal: 12,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    fontWeight: 700,
    color: colors.gold,
    letterSpacing: 2,
  },
  itemCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textWrapper: {
    flexShrink: 1,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    fontWeight: 700,
    color: colors.primaryText,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    color: colors.secondaryText,
  }
});

interface EventInformationProps {
  viewModel: InvoiceViewModel;
}

export const EventInformation = ({ viewModel }: EventInformationProps) => (
  <View style={styles.container}>
    <View style={styles.innerContainer}>
      <View style={styles.titleWrapper}>
        <Text style={styles.titleText}>EVENT INFORMATION</Text>
      </View>
      <View style={styles.itemCol}>
        <View style={styles.iconWrapper}>
          <CalendarIcon color={colors.gold} size={12} />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.label}>EVENT DATE</Text>
          <Text style={styles.value}>{viewModel.eventDate}</Text>
        </View>
      </View>

      <View style={styles.itemCol}>
        <View style={styles.iconWrapper}>
          <LocationIcon color={colors.gold} size={12} />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.label}>VENUE</Text>
          <Text style={styles.value}>{viewModel.venue}</Text>
        </View>
      </View>

      <View style={styles.itemCol}>
        <View style={styles.iconWrapper}>
          <PackageIcon color={colors.gold} size={12} />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.label}>PACKAGE</Text>
          <Text style={styles.value}>{viewModel.packageName}</Text>
        </View>
      </View>

      <View style={styles.itemCol}>
        <View style={styles.iconWrapper}>
          <CameraIcon color={colors.gold} size={12} />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.label}>PHOTOGRAPHER</Text>
          <Text style={styles.value}>{viewModel.photographers}</Text>
        </View>
      </View>
    </View>
  </View>
);
