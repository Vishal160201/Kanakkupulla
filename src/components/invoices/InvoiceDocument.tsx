import React from 'react';
import { Document, Page, View, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceViewModel } from './types/invoiceViewModel';
import { Header, HeroPhoto } from './components/Header';
import { BillingSection } from './components/BillingSection';
import { EventInformation } from './components/EventInformation';
import { InvoiceItemsTable } from './components/InvoiceItemsTable';
import { SummarySection } from './components/SummarySection';
import { ClosingSection, ContactBar } from './components/Footer';
import { BackgroundDecoration } from './ui/BackgroundDecoration';
import { INVOICE_CONSTANTS } from './theme/constants';
import { colors, typography } from './theme/invoiceTheme';

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.page,
    fontFamily: typography.sans,
    paddingTop: 14,
    paddingBottom: INVOICE_CONSTANTS.page.paddingBottom,
    paddingHorizontal: INVOICE_CONSTANTS.page.paddingHorizontal,
  },
});

/** The one invoice template; status (pending / partial / paid / overdue) only changes what's shown. */
export default function InvoiceDocument({ viewModel: vm }: { viewModel: InvoiceViewModel }) {
  return (
    <Document title={vm.meta.title} author={vm.studio.name} subject={vm.meta.subject} keywords={`${vm.meta.keywords}, template ${vm.meta.templateVersion}`} creator="Moondot Studio / Kanakkupulla" producer="Kanakkupulla">
      <Page size="A4" style={styles.page}>
        <BackgroundDecoration assets={vm.assets} />
        {/* No photo (e.g. a gift order without a reference image): the header simply starts at the margin */}
        {vm.heroImageUrl && (
          <View style={{ position: 'absolute', top: 0, left: 0 }}>
            <HeroPhoto src={vm.heroImageUrl} />
          </View>
        )}
        <Header viewModel={vm} />
        <BillingSection viewModel={vm} />
        <EventInformation viewModel={vm} />
        <InvoiceItemsTable viewModel={vm} />
        <SummarySection viewModel={vm} />
        <ClosingSection viewModel={vm} />
        <ContactBar viewModel={vm} />
      </Page>
    </Document>
  );
}
