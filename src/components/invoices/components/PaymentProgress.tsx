import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { PaymentProgress as Progress, PaymentStep } from '../types/paymentProgress';
import { ProgressBar } from '../ui/ProgressBar';
import { Icon } from '../icons';
import { colors, typography } from '../theme/invoiceTheme';

const STEP_W = 58;

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  title: { fontFamily: typography.sans, fontSize: 8, fontWeight: 700, letterSpacing: 1, color: colors.ink },
  pct: { fontFamily: typography.sans, fontSize: 8.5, fontWeight: 700, color: colors.ink },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  endLabel: { fontFamily: typography.sans, fontSize: 6.5, color: colors.muted },
  endValue: { fontFamily: typography.sans, fontSize: 9, fontWeight: 700, color: colors.ink, marginTop: 1 },
  steps: { flexDirection: 'row', marginTop: 8 },
  step: { width: STEP_W, alignItems: 'center' },
  circle: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2 },
  circleNum: { fontFamily: typography.sans, fontSize: 7.5, fontWeight: 700 },
  link: { flex: 1, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.gold, marginTop: 8.5, marginHorizontal: -10 },
  label: { fontFamily: typography.sans, fontSize: 7, fontWeight: 700, color: colors.ink, marginTop: 4, textAlign: 'center' },
  caption: { fontFamily: typography.sans, fontSize: 6, color: colors.muted, marginTop: 1.5, textAlign: 'center' },
  amount: { fontFamily: typography.sans, fontSize: 7, fontWeight: 600, color: colors.text, marginTop: 1.5 },
});

const Circle = ({ step, n }: { step: PaymentStep; n: number }) => {
  if (step.state === 'done') {
    return (
      <View style={[styles.circle, { backgroundColor: colors.gold, borderColor: colors.gold }]}>
        <Icon name="check" color={colors.white} size={8} />
      </View>
    );
  }
  const c = step.state === 'overdue' ? colors.red : colors.gold;
  return (
    <View style={[styles.circle, { backgroundColor: colors.white, borderColor: c }]}>
      <Text style={[styles.circleNum, { color: c }]}>{n}</Text>
    </View>
  );
};

export const PaymentProgress = ({ progress, overdue }: { progress: Progress; overdue: boolean }) => (
  <View>
    <View style={styles.head}>
      <Text style={styles.title}>PAYMENT PROGRESS</Text>
      <Text style={styles.pct}>{progress.percentage}% Paid</Text>
    </View>
    <ProgressBar percent={progress.percentage} color={overdue && progress.percentage === 0 ? colors.red : colors.gold} />
    <View style={styles.ends}>
      <View>
        <Text style={styles.endLabel}>Paid</Text>
        <Text style={styles.endValue}>{progress.paid}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.endLabel}>Total</Text>
        <Text style={styles.endValue}>{progress.total}</Text>
      </View>
    </View>
    <View style={[styles.steps, progress.steps.length === 1 ? { justifyContent: 'center' } : {}]}>
      {progress.steps.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.link} />}
          <View style={styles.step}>
            <Circle step={s} n={i + 1} />
            <Text style={styles.label}>{s.label}</Text>
            <Text style={[styles.caption, s.state === 'overdue' ? { color: colors.red } : {}]}>{s.caption}</Text>
            <Text style={styles.amount}>{s.amount}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  </View>
);
