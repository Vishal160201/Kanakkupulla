import React from 'react';
import { Document, Page, View, Text, StyleSheet, Image as PdfImage } from '@react-pdf/renderer';
import { InvoiceViewModel } from './types/invoiceViewModel';
import { Header } from './components/Header';
import { BillingSection } from './components/BillingSection';
import { EventInformation } from './components/EventInformation';
import { InvoiceItemsTable } from './components/InvoiceItemsTable';
import { SummarySection } from './components/SummarySection';
import { PaymentProgress } from './components/PaymentProgress';
import { Footer } from './components/Footer';
import { BackgroundDecoration } from './ui/BackgroundDecoration';

import { colors, typography, radius } from './theme/invoiceTheme';

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    fontFamily: typography.fontFamily,
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 160,
  },
  contentWrapper: {
    paddingTop: 30,
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  middleSection: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountDueCardDark: {
    backgroundColor: colors.darkBox,
  },
  amountDueCardSuccess: {
    backgroundColor: colors.successGreen,
  },
  amountDueCard: {
    width: '30%',
    borderRadius: radius.md,
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountDueLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    color: colors.gold,
    marginBottom: 12,
  },
  amountDueLabelSuccess: {
    color: '#E0F2FE',
  },
  amountDueValue: {
    fontFamily: typography.serifFamily,
    fontSize: 24,
    color: colors.gold,
    marginBottom: 16,
  },
  amountDueValueSuccess: {
    color: colors.white,
  },
  amountDueSubLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    color: colors.border,
    borderTopWidth: 1,
    borderTopColor: 'rgba(235, 229, 218, 0.2)',
    paddingTop: 12,
    width: '100%',
    textAlign: 'center',
  },
  amountDueSubLabelSuccess: {
    color: '#E0F2FE',
  },
  summaryWrapper: {
    width: '28%',
    paddingTop: 5,
  },
  progressWrapper: {
    width: '35%',
    paddingTop: 5,
  },
  stampImage: {
    position: 'absolute',
    bottom: -15,
    right: 20,
    width: 140,
    height: 140,
    zIndex: 20,
  },
});

interface InvoiceDocumentProps {
  viewModel: InvoiceViewModel;
}

export default function InvoiceDocument({ viewModel }: InvoiceDocumentProps) {
  const isPaid = viewModel.status === 'PAID';

  return (
    <Document 
      title={`Invoice #${viewModel.invoiceNumber}`}
      author={viewModel.socials.website}
      subject="Invoice for Photography Services"
      creator="Moondot Studio"
      producer="Kanakkupulla"
    >
      <Page size="A4" style={styles.page}>
        <BackgroundDecoration assets={viewModel.assets} />
        
        <View style={styles.contentWrapper}>
          <Header viewModel={viewModel} />
          <BillingSection viewModel={viewModel} />
          <EventInformation viewModel={viewModel} />
          <InvoiceItemsTable viewModel={viewModel} />
          
          <View style={styles.middleSection} wrap={false}>
            {/* Amount Due Card */}
            <View style={[styles.amountDueCard, viewModel.summaryCardVariant.theme === 'success' ? styles.amountDueCardSuccess : styles.amountDueCardDark]}>
              <Text style={[styles.amountDueLabel, viewModel.summaryCardVariant.theme === 'success' ? styles.amountDueLabelSuccess : {}]}>{viewModel.summaryCardVariant.title}</Text>
              <Text style={[styles.amountDueValue, viewModel.summaryCardVariant.theme === 'success' ? styles.amountDueValueSuccess : {}]}>{viewModel.summaryCardVariant.amount}</Text>
              <Text style={[styles.amountDueSubLabel, viewModel.summaryCardVariant.theme === 'success' ? styles.amountDueSubLabelSuccess : {}]}>{viewModel.summaryCardVariant.subLabel}</Text>
            </View>

            {/* Summary List */}
            <View style={styles.summaryWrapper}>
              <SummarySection viewModel={viewModel} />
            </View>

            {/* Payment Progress Stepper */}
            <View style={styles.progressWrapper}>
              {!isPaid && <PaymentProgress viewModel={viewModel} />}
            </View>
          </View>
        </View>

        {/* Absolute Footer */}
        <Footer viewModel={viewModel} />
        
        {/* Absolute Stamp */}
        <PdfImage src={viewModel.assets.stamp} style={styles.stampImage} fixed />
      </Page>
    </Document>
  );
}
