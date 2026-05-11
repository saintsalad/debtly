import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCardShadow, useColors, type, space, radius, type ColorPalette } from '@/lib/platform';
import { useCurrency } from '@/hooks/useCurrency';

interface SummaryCardProps {
  label: string;
  amount: number;
  count: number;
  accentColor: string;
}

function createStyles(palette: ColorPalette, shadow: ReturnType<typeof useCardShadow>) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      padding: space[4],
      ...shadow,
    },
    label: {
      ...type.caption1,
      color: palette.labelSecondary,
      marginBottom: space[1],
    },
    amount: {
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: -0.5,
      marginBottom: 2,
    },
    count: {
      ...type.caption2,
      color: palette.labelTertiary,
    },
  });
}

export function SummaryCard({ label, amount, count, accentColor }: SummaryCardProps) {
  const palette = useColors();
  const shadow = useCardShadow();
  const styles = useMemo(() => createStyles(palette, shadow), [palette, shadow]);
  const { fmt } = useCurrency();

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color: accentColor }]}>{fmt(amount)}</Text>
      <Text style={styles.count}>{count} {count === 1 ? 'debt' : 'debts'}</Text>
    </View>
  );
}
