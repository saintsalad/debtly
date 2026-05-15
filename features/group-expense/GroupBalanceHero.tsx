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
  /** Light text over a dark image / gradient */
  overlay?: boolean;
}

function createStyles(palette: ColorPalette, compact: boolean, overlay: boolean) {
  if (overlay) {
    return StyleSheet.create({
      root: {
        alignItems: 'center',
        gap: compact ? space[2] : space[2],
        paddingVertical: compact ? space[1] : space[2],
      },
      status: {
        ...type.subheadline,
        color: 'rgba(255,255,255,0.88)',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
      amount: {
        ...type.title1,
        fontWeight: '700',
        letterSpacing: -0.6,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
      meta: {
        ...type.footnote,
        color: 'rgba(255,255,255,0.72)',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      positive: { color: palette.positive },
      negative: { color: palette.negative },
      neutral: { color: '#FFFFFF' },
    });
  }

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

export function GroupBalanceHero({
  summary,
  totalSpendMinor,
  compact,
  overlay,
}: GroupBalanceHeroProps) {
  const palette = useColors();
  const styles = useMemo(
    () => createStyles(palette, Boolean(compact), Boolean(overlay)),
    [palette, compact, overlay]
  );
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
