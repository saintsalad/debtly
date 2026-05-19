import { GlassCard } from '@/components/ui/GlassCard';
import { ListDivider } from '@/components/ui/ListDivider';
import {
  formatPaymentDateTime,
  getDebtPaymentsNewestFirst,
  getPaymentAmountMajor,
} from '@/features/debts/paymentHistory';
import type { Debt } from '@/features/debts/types';
import { useCurrency } from '@/hooks/useCurrency';
import { sansForWeight } from '@/lib/appFonts';
import { useColors, radius, space, type, type ColorPalette } from '@/lib/platform';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PaymentHistorySectionProps {
  debt: Debt;
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    section: {
      gap: space[2],
    },
    sectionTitle: {
      ...type.footnote,
      color: palette.labelSecondary,
      paddingLeft: space[1],
    },
    card: {},
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingVertical: space[4],
    },
    rowMain: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    amount: {
      ...type.subheadline,
      fontWeight: '600',
      fontFamily: sansForWeight('600'),
      color: palette.positive,
    },
    date: {
      ...type.caption1,
      color: palette.labelSecondary,
    },
    note: {
      ...type.caption1,
      color: palette.labelTertiary,
      marginTop: 2,
    },
    amountColumn: {
      alignItems: 'flex-end',
    },
  });
}

export function PaymentHistorySection({ debt }: PaymentHistorySectionProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { fmt } = useCurrency();
  const payments = useMemo(() => getDebtPaymentsNewestFirst(debt), [debt]);

  if (payments.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment history</Text>
      <GlassCard style={styles.card} borderRadius={radius.card}>
        {payments.map((payment, index) => (
          <React.Fragment key={payment.id}>
            {index > 0 ? <ListDivider variant="glass" /> : null}
            <View style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.date}>{formatPaymentDateTime(payment.paidAt)}</Text>
                {payment.note ? (
                  <Text style={styles.note} numberOfLines={2}>
                    {payment.note}
                  </Text>
                ) : null}
              </View>
              <View style={styles.amountColumn}>
                <Text style={styles.amount}>{fmt(getPaymentAmountMajor(payment))}</Text>
              </View>
            </View>
          </React.Fragment>
        ))}
      </GlassCard>
    </View>
  );
}
