import React from 'react';
import { View, Text, StyleSheet, Link, Image as PdfImage } from '@react-pdf/renderer';
import type { InvoiceViewModel, PaymentMethods as Methods } from '../types/invoiceViewModel';
import type { GlyphName } from '../icons/glyphs';
import { Section } from '../ui/Section';
import { IconTile } from '../ui/InfoRow';
import { Icon } from '../icons';
import { colors, radius, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 8 },
  methods: { width: '60%', paddingTop: 9, paddingBottom: 10, paddingHorizontal: 4 },
  sectionTitle: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4, color: colors.gold },
  cols: { flexDirection: 'row', marginTop: 8 },
  col: { paddingHorizontal: 9 },
  colHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  colTitle: { fontFamily: typography.sans, fontSize: 6.5, fontWeight: 700, color: colors.ink, letterSpacing: 0.4 },
  colSub: { fontFamily: typography.sans, fontSize: 5.5, color: colors.muted, marginTop: 1 },
  fieldLabel: { fontFamily: typography.sans, fontSize: 5.5, color: colors.muted, marginTop: 4 },
  fieldValue: { fontFamily: typography.sans, fontSize: 7, fontWeight: 700, color: colors.ink, marginTop: 1 },
  qr: { width: 62, height: 62 },
  upi: { fontFamily: typography.sans, fontSize: 6, color: colors.text, textAlign: 'center', marginTop: 5 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 7, marginTop: 6, textDecoration: 'none' },
  buttonText: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700, color: colors.white, marginLeft: 4 },
  phone: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700, color: colors.ink, textAlign: 'center', marginTop: 8 },
  terms: { flex: 1, marginLeft: 14, paddingTop: 4 },
  bullet: { flexDirection: 'row', marginTop: 4 },
  bulletDot: { fontFamily: typography.sans, fontSize: 7, color: colors.gold, width: 8 },
  bulletText: { flex: 1, fontFamily: typography.sans, fontSize: 6.8, color: colors.text, lineHeight: 1.35 },
  thanks: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  thanksText: { fontFamily: typography.script, fontSize: 22, color: colors.gold },
  appreciate: { fontFamily: typography.sans, fontSize: 7, color: colors.text, marginTop: 1 },
  stamp: { position: 'absolute', right: -6, bottom: -20, width: 74, height: 74 },
  review: { flexDirection: 'row', marginTop: 8, padding: 14, alignItems: 'center' },
  reviewTitle: { fontFamily: typography.sans, fontSize: 9.5, fontWeight: 700, color: colors.ink },
  reviewText: { fontFamily: typography.sans, fontSize: 7.5, color: colors.text, marginTop: 4, lineHeight: 1.4 },
  reviewLink: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700, color: colors.goldDeep, marginTop: 6, textDecoration: 'none' },
  bar: { position: 'absolute', left: 32, right: 32, bottom: 18, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: radius.md },
  barItem: { flexDirection: 'row', alignItems: 'center' },
  barText: { fontFamily: typography.sans, fontSize: 7, marginLeft: 5 },
  page: { position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontFamily: typography.sans, fontSize: 6, color: colors.muted },
});

const ColHead = ({ icon, title, sub }: { icon: GlyphName; title: string; sub: string }) => (
  <View style={styles.colHead}>
    <IconTile icon={icon} size={20} />
    <View style={{ marginLeft: 6, flex: 1 }}>
      <Text style={styles.colTitle}>{title}</Text>
      <Text style={styles.colSub}>{sub}</Text>
    </View>
  </View>
);

const PaymentMethods = ({ payment }: { payment: Methods }) => {
  const cols: React.ReactNode[] = [];
  if (payment.upiId)
    cols.push(
      <View key="upi" style={styles.col}>
        <ColHead icon="qr" title="UPI / QR CODE" sub="Scan to pay securely" />
        {payment.qrCodeDataUrl && (
          <View style={{ alignItems: 'center' }}>
            <PdfImage src={payment.qrCodeDataUrl} style={styles.qr} />
          </View>
        )}
        <Text style={styles.upi}>UPI ID: {payment.upiId}</Text>
      </View>
    );
  if (payment.bank)
    cols.push(
      <View key="bank" style={styles.col}>
        <ColHead icon="bank" title="BANK" sub="Transfer to our account" />
        {payment.bank.accountName && (
          <>
            <Text style={styles.fieldLabel}>Account name</Text>
            <Text style={styles.fieldValue}>{payment.bank.accountName}</Text>
          </>
        )}
        <Text style={styles.fieldLabel}>Account number</Text>
        <Text style={styles.fieldValue}>{payment.bank.accountNumber}</Text>
        <Text style={styles.fieldLabel}>IFSC code</Text>
        <Text style={styles.fieldValue}>{payment.bank.ifsc}</Text>
        {payment.bank.bankName && (
          <>
            <Text style={styles.fieldLabel}>Bank</Text>
            <Text style={styles.fieldValue}>{payment.bank.bankName}</Text>
          </>
        )}
      </View>
    );
  if (payment.whatsapp)
    cols.push(
      <View key="wa" style={styles.col}>
        <ColHead icon="whatsapp" title="WHATSAPP" sub="Message us once you've paid" />
        <Link src={payment.whatsapp.link} style={styles.button}>
          <Icon name="whatsapp" color={colors.white} size={9} />
          <Text style={styles.buttonText}>Send payment proof</Text>
        </Link>
        <Text style={styles.phone}>{payment.whatsapp.phone}</Text>
      </View>
    );
  if (cols.length === 0) return null;
  return (
    <Section style={styles.methods}>
      <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>PAYMENT METHODS</Text>
      <View style={styles.cols}>
        {cols.map((c, i) => (
          <View key={i} style={[{ flex: 1 }, i > 0 ? { borderLeftWidth: 1, borderLeftColor: colors.rule } : {}]}>
            {c}
          </View>
        ))}
      </View>
    </Section>
  );
};

const ThankYou = ({ center }: { center?: boolean }) => (
  <View style={center ? { alignItems: 'center' } : {}}>
    <View style={styles.thanks}>
      <Text style={styles.thanksText}>Thank You!</Text>
      <View style={{ marginLeft: 4, marginTop: 2 }}>
        <Icon name="heart" color={colors.gold} size={12} />
      </View>
    </View>
    <Text style={[styles.appreciate, center ? { textAlign: 'center' } : {}]}>We truly appreciate your trust in us.</Text>
    {center && <Text style={[styles.appreciate, { textAlign: 'center' }]}>We can&apos;t wait to create more beautiful memories for you.</Text>}
  </View>
);

/** Unpaid: how to pay + terms. Paid: a thank-you with an optional review link. */
export const ClosingSection = ({ viewModel: vm }: { viewModel: InvoiceViewModel }) => {
  if (vm.status === 'PAID') {
    return (
      <Section style={styles.review}>
        <PdfImage src={vm.assets.google} style={{ width: 34, height: 34 }} />
        <View style={{ flex: 1, marginLeft: 12, paddingRight: 14 }}>
          <Text style={styles.reviewTitle}>We&apos;d love your feedback!</Text>
          <Text style={styles.reviewText}>If you enjoyed working with us, please take a moment to leave us a review on Google.</Text>
          {vm.review?.url && (
            <Link src={vm.review.url} style={styles.reviewLink}>
              Leave a review
            </Link>
          )}
        </View>
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.rule }} />
        <View style={{ flex: 1.1, paddingLeft: 14 }}>
          <ThankYou center />
        </View>
      </Section>
    );
  }
  return (
    <View style={styles.row} wrap={false}>
      {vm.payment && <PaymentMethods payment={vm.payment} />}
      <View style={styles.terms}>
        <Text style={styles.sectionTitle}>TERMS &amp; CONDITIONS</Text>
        {vm.terms.map((t, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{t}</Text>
          </View>
        ))}
        <ThankYou />
        <PdfImage src={vm.assets.stamp} style={styles.stamp} />
      </View>
    </View>
  );
};

/** Contact bar on every page (dark while unpaid, light once paid), plus page numbers on long invoices. */
export const ContactBar = ({ viewModel: vm }: { viewModel: InvoiceViewModel }) => {
  const light = vm.status === 'PAID';
  return (
    <>
      <View fixed style={[styles.bar, light ? { borderTopWidth: 0.8, borderTopColor: colors.gold, borderRadius: 0 } : { backgroundColor: colors.dark }]}>
        {vm.contacts.map((c) => (
          <View key={c.icon} style={styles.barItem}>
            <Icon name={c.icon} color={light ? colors.goldDeep : colors.gold} size={8.5} />
            <Text style={[styles.barText, { color: light ? colors.text : colors.darkText }]}>{c.text}</Text>
          </View>
        ))}
      </View>
      <Text fixed style={styles.page} render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : '')} />
    </>
  );
};
