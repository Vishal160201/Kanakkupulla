import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoiceViewModel } from '../types/invoiceViewModel';
import { ProgressBar } from '../ui/ProgressBar';
import { colors, typography } from '../theme/invoiceTheme';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: colors.primaryText,
  },
  percent: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: 700,
    color: colors.primaryText,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  stepperLineWrapper: {
    position: 'absolute',
    top: 10,
    left: '10%',
    width: '80%',
    height: 1,
  },
  stepperLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopStyle: 'dashed',
    borderColor: colors.border,
  },
  step: {
    alignItems: 'center',
    width: 60,
    backgroundColor: colors.background, // clear out the line behind the circle
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  stepCircleCompleted: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  stepNumber: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    fontWeight: 700,
    color: colors.gold,
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    fontWeight: 700,
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: 2,
  },
  stepStatus: {
    fontFamily: typography.fontFamily,
    fontSize: 5,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 2,
  },
  stepAmount: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    fontWeight: 700,
    color: colors.primaryText,
    textAlign: 'center',
  },
  paidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  paidLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 6,
    color: colors.secondaryText,
  },
  paidTotalValue: {
    fontFamily: typography.fontFamily,
    fontSize: 8,
    fontWeight: 700,
    color: colors.primaryText,
  }
});

interface PaymentProgressProps {
  viewModel: InvoiceViewModel;
}

export const PaymentProgress = ({ viewModel }: PaymentProgressProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PAYMENT PROGRESS</Text>
        <Text style={styles.percent}>{viewModel.paymentProgress.percentage}% Paid</Text>
      </View>
      
      <ProgressBar 
        percent={viewModel.paymentProgress.percentage} 
        color={colors.gold} 
      />
      
      <View style={{ marginTop: 8 }}>
        <View style={styles.paidRow}>
          <Text style={styles.paidLabel}>Paid</Text>
          <Text style={styles.paidLabel}>Total</Text>
        </View>
        <View style={styles.paidRow}>
          <Text style={styles.paidTotalValue}>{viewModel.summaryRows.find(r => r.label === 'Amount Paid')?.value || '₹0'}</Text>
          <Text style={styles.paidTotalValue}>{viewModel.summaryRows.find(r => r.isTotal)?.value || '₹0'}</Text>
        </View>
      </View>

      <View style={styles.stepperContainer}>
        <View style={styles.stepperLineWrapper}>
          <View style={styles.stepperLine} />
        </View>

        {viewModel.paymentProgress.steps.map((step, idx) => {
          const isCompleted = step.completed;
          const isActive = !isCompleted && (idx === 0 || viewModel.paymentProgress.steps[idx - 1].completed);
          
          return (
            <View key={idx} style={styles.step}>
              <View style={[
                styles.stepCircle, 
                ...(isActive ? [styles.stepCircleActive] : []),
                ...(isCompleted ? [styles.stepCircleCompleted] : []),
              ]}>
                {isCompleted ? (
                  <Text style={styles.stepNumberActive}>✓</Text>
                ) : (
                  <Text style={isActive ? [styles.stepNumber, styles.stepNumberActive] : styles.stepNumber}>{idx + 1}</Text>
                )}
              </View>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepStatus}>{isCompleted ? 'Paid' : 'Due'}</Text>
              <Text style={styles.stepAmount}>{step.amount}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};
