import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { ListDivider } from '@/components/ui/ListDivider';
import { Debt } from '@/features/debts/types';
import { getTotalPaid } from '@/features/debts/debtCalculations';
import { minorToMajor } from '@/features/debts/money';
import { useCurrency } from '@/hooks/useCurrency';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

interface PartialPaymentSectionProps {
  debt: Debt;
  remainingBalance: number;
  progress: number;
  onRecordPayment: (amount: number) => void;
}

function formatPaymentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.fillSecondary,
      borderRadius: radius.lg,
      overflow: 'hidden',
      gap: space[4],
      padding: space[4],
    },
    header: {
      gap: space[1],
    },
    title: {
      ...type.headline,
      color: palette.label,
    },
    subtitle: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    progressTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: palette.fill,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: palette.tint,
    },
    progressMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: space[3],
    },
    progressLabel: {
      ...type.caption1,
      color: palette.labelSecondary,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    input: {
      flex: 1,
      paddingHorizontal: space[4],
      paddingVertical: 12,
      borderRadius: radius.sm,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    history: {
      gap: space[3],
    },
    historyTitle: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[3],
    },
    historyAmount: {
      ...type.subheadline,
      fontWeight: '600',
      color: palette.label,
    },
    historyMeta: {
      ...type.caption1,
      color: palette.labelSecondary,
    },
  });
}

export function PartialPaymentSection({
  debt,
  remainingBalance,
  progress,
  onRecordPayment,
}: PartialPaymentSectionProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { fmt, symbol } = useCurrency();
  const [paymentAmount, setPaymentAmount] = useState('');
  const payments = [...(debt.payments ?? [])].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  );

  const handleSubmit = () => {
    const parsed = parseFloat(paymentAmount.replace(/[^0-9.]/g, ''));
    if (!parsed || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter a payment greater than 0.');
      return;
    }
    if (parsed > remainingBalance + 0.009) {
      Alert.alert('Amount too high', `Enter up to ${fmt(remainingBalance)}.`);
      return;
    }

    onRecordPayment(parsed);
    setPaymentAmount('');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Partial payment</Text>
        <Text style={styles.subtitle}>
          Record what has been paid and keep the remaining balance current.
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <View style={styles.progressMeta}>
        <Text style={styles.progressLabel}>{fmt(getTotalPaid(debt))} paid</Text>
        <Text style={styles.progressLabel}>{fmt(remainingBalance)} remaining</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={`${symbol}0.00`}
          placeholderTextColor={palette.placeholder}
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          keyboardType="decimal-pad"
        />
        <Button variant="primary" size="md" onPress={handleSubmit}>
          <Button.Label>Record</Button.Label>
        </Button>
      </View>

      {payments.length > 0 ? (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>Payment history</Text>
          {payments.map((payment, index) => (
            <View key={payment.id}>
              {index > 0 ? <ListDivider /> : null}
              <View style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyAmount}>{fmt(minorToMajor(payment.amountMinor))}</Text>
                  <Text style={styles.historyMeta}>
                    {formatPaymentDate(payment.paidAt)}
                    {payment.note ? ` · ${payment.note}` : ''}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
