import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, space, radius, cardShadow } from '@/lib/platform';
import { useCurrency } from '@/hooks/useCurrency';

interface SummaryCardProps {
  label: string;
  amount: number;
  count: number;
  accentColor: string;
}

export function SummaryCard({ label, amount, count, accentColor }: SummaryCardProps) {
  const { fmt } = useCurrency();
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color: accentColor }]}>{fmt(amount)}</Text>
      <Text style={styles.count}>{count} {count === 1 ? 'debt' : 'debts'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: space[4],
    ...cardShadow,
  },
  label: {
    ...type.caption1,
    color: colors.labelSecondary,
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
    color: colors.labelTertiary,
  },
});
