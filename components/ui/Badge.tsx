import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DebtStatus } from '@/features/debts/types';

const CONFIG: Record<DebtStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: '#FFF8E1', color: '#D97706' },
  paid:    { label: 'Paid',    bg: '#F0FDF4', color: '#16A34A' },
  overdue: { label: 'Overdue', bg: '#FEF2F2', color: '#DC2626' },
};

export function Badge({ status }: { status: DebtStatus }) {
  const cfg = CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '600' },
});
