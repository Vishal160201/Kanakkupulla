import React from 'react';
import { View, Text, StyleSheet, Image as PdfImage } from '@react-pdf/renderer';
import { InvoiceViewModel } from '../types/invoiceViewModel';
import { InstagramIcon, GlobeIcon, PhoneIcon, MailIcon, HeartIcon } from '../icons';
import { colors, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 10,
    paddingBottom: 50, // leave space for bottom bar
  },
  leftCol: {
    width: '60%',
    flexDirection: 'column',
  },
  rightCol: {
    width: '35%',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: 700,
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodCol: {
    flex: 1,
    paddingRight: 10,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    fontWeight: 700,
    color: colors.primaryText,
  },
  methodSubText: {
    fontFamily: typography.fontFamily,
    fontSize: 5,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  qrCode: {
    width: 60,
    height: 60,
    marginBottom: 6,
  },
  bankFieldLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 5,
    color: colors.secondaryText,
    marginTop: 4,
  },
  bankFieldValue: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    fontWeight: 700,
    color: colors.primaryText,
  },
  whatsappBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 6,
    fontWeight: 700,
  },
  upiText: {
    fontFamily: typography.fontFamily,
    fontSize: 5,
    color: colors.secondaryText,
    marginTop: 4,
  },
  termItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  termBullet: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xxs,
    color: colors.primaryText,
    marginRight: 6,
  },
  termText: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    color: colors.secondaryText,
    flexShrink: 1,
    lineHeight: 1.5,
  },
  thankYouWrapper: {
    marginTop: 16,
  },
  thankYouRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thankYouCursive: {
    fontFamily: typography.cursiveFamily,
    fontSize: 26,
    color: colors.gold,
    marginBottom: 2,
  },
  thankYouSub: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    color: colors.primaryText,
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
    backgroundColor: colors.darkBox,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialText: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    color: '#E8E4D9',
    marginLeft: 6,
  },
});

interface FooterProps {
  viewModel: InvoiceViewModel;
}

export const Footer = ({ viewModel }: FooterProps) => (
  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%' }} fixed>
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <Text style={styles.sectionTitle}>PAYMENT METHODS</Text>
        <View style={styles.methodsGrid}>
          <View style={styles.methodCol}>
            <View style={styles.methodTitleRow}>
              <Text style={styles.methodTitle}>UPI / QR CODE</Text>
            </View>
            <Text style={styles.methodSubText}>Scan to pay securely</Text>
            {viewModel.qrCodeDataUrl ? (
              <PdfImage src={viewModel.qrCodeDataUrl} style={styles.qrCode} />
            ) : null}
            <Text style={styles.upiText}>UPI ID: {viewModel.settings.studio_upi_id || 'moondotstudio@okaxis'}</Text>
          </View>
          
          <View style={styles.methodCol}>
            <View style={styles.methodTitleRow}>
              <Text style={styles.methodTitle}>BANK TRANSFER</Text>
            </View>
            <Text style={styles.methodSubText}>Transfer to our bank account</Text>
            <Text style={styles.bankFieldLabel}>Account Name</Text>
            <Text style={styles.bankFieldValue}>{viewModel.settings.studio_bank_name || 'Moondot Studio'}</Text>
            <Text style={styles.bankFieldLabel}>Account Number</Text>
            <Text style={styles.bankFieldValue}>{viewModel.settings.studio_bank_account_no || '50200012345678'}</Text>
            <Text style={styles.bankFieldLabel}>IFSC Code</Text>
            <Text style={styles.bankFieldValue}>{viewModel.settings.studio_bank_ifsc || 'HDFC0001234'}</Text>
            <Text style={styles.bankFieldLabel}>Bank</Text>
            <Text style={styles.bankFieldValue}>HDFC Bank</Text>
          </View>
          
          <View style={styles.methodCol}>
            <View style={styles.methodTitleRow}>
              <Text style={styles.methodTitle}>WHATSAPP PAYMENT LINK</Text>
            </View>
            <Text style={styles.methodSubText}>Quick & easy payment</Text>
            <View style={styles.whatsappBtn}>
              <Text style={styles.whatsappBtnText}>Pay via WhatsApp</Text>
            </View>
            <Text style={[styles.bankFieldValue, { textAlign: 'center', marginTop: 10 }]}>{viewModel.socials.phone}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.rightCol}>
        <Text style={styles.sectionTitle}>TERMS & CONDITIONS</Text>
        {viewModel.footerNotes?.map((note, index) => (
          <View key={index} style={styles.termItem}>
            <Text style={styles.termBullet}>•</Text>
            <Text style={styles.termText}>{note}</Text>
          </View>
        ))}
        
        <View style={styles.thankYouWrapper}>
          <View style={styles.thankYouRow}>
            <Text style={styles.thankYouCursive}>Thank You!</Text>
            <HeartIcon color={colors.gold} size={16} />
          </View>
          <Text style={styles.thankYouSub}>We truly appreciate your trust in us.</Text>
        </View>
      </View>
    </View>
    
    <View style={styles.bottomBarWrapper}>
      <View style={styles.socialItem}>
        <InstagramIcon color="#E8E4D9" size={10} />
        <Text style={styles.socialText}>{viewModel.socials.instagram.replace('https://', '') || 'instagram.com/moondot.studio'}</Text>
      </View>
      <View style={styles.socialItem}>
        <GlobeIcon color="#E8E4D9" size={10} />
        <Text style={styles.socialText}>{viewModel.socials.website.replace('https://', '') || 'www.moondotstudio.com'}</Text>
      </View>
      <View style={styles.socialItem}>
        <PhoneIcon color="#E8E4D9" size={10} />
        <Text style={styles.socialText}>{viewModel.socials.phone}</Text>
      </View>
      <View style={styles.socialItem}>
        <MailIcon color="#E8E4D9" size={10} />
        <Text style={styles.socialText}>{viewModel.socials.email}</Text>
      </View>
    </View>
  </View>
);
