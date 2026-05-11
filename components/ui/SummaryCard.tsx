import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCurrency } from '@/hooks/useCurrency';

interface SummaryCardProps {
  label: string;
  amount: number;
  count: number;
  accentColor: string;
  bgColor: string;
}

export function SummaryCard({ label, amount, count, accentColor, bgColor }: SummaryCardProps) {
  const { fmt } = useCurrency();
  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color: accentColor }]}>{fmt(amount)}</Text>
      <Text style={styles.count}>
        {count} {count === 1 ? 'item' : 'items'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  count: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
