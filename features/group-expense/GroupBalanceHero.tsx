import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GroupBalanceSummary } from '@/features/group-expense/types';
import { useCurrency } from '@/hooks/useCurrency';
import { minorToMajor } from '@/features/debts/money';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';

interface GroupBalanceHeroProps {
  summary: GroupBalanceSummary;
  totalSpendMinor: number;
  compact?: boolean;
}

function createStyles(palette: ColorPalette, compact: boolean) {
  return StyleSheet.create({
    root: {
      alignItems: 'center',
      gap: compact ? space[2] : space[3],
      paddingVertical: compact ? space[2] : space[3],
    },
    status: {
      ...type.subheadline,
      color: palette.labelSecondary,
      textAlign: 'center',
    },
    amount: {
      ...type.title1,
      fontWeight: '700',
      letterSpacing: -0.6,
      textAlign: 'center',
    },
    meta: {
      ...type.footnote,
      color: palette.labelTertiary,
      textAlign: 'center',
    },
    positive: { color: palette.positive },
    negative: { color: palette.negative },
    neutral: { color: palette.label },
  });
}

export function GroupBalanceHero({ summary, totalSpendMinor, compact }: GroupBalanceHeroProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette, Boolean(compact)), [palette, compact]);
  const { fmt } = useCurrency();

  const net = summary.youAreOwedMinor - summary.youOweMinor;
  const status =
    summary.isSettled
      ? 'All settled up'
      : net > 0
        ? 'You are owed'
        : net < 0
          ? 'You owe'
          : 'Balanced';

  const amountStyle =
    summary.isSettled ? styles.neutral : net > 0 ? styles.positive : net < 0 ? styles.negative : styles.neutral;

  return (
    <View style={styles.root}>
      <Text style={styles.status}>{status}</Text>
      <Text style={[styles.amount, amountStyle]}>
        {summary.isSettled
          ? fmt(0)
          : fmt(minorToMajor(Math.abs(net)))}
      </Text>
      <Text style={styles.meta}>
        {fmt(minorToMajor(totalSpendMinor))} total group spending
      </Text>
    </View>
  );
}
