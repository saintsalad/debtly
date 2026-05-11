import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DebtStatus } from '@/features/debts/types';
import { colors, type } from '@/lib/platform';

const CONFIG: Record<DebtStatus, { label: string; color: string }> = {
  overdue:  { label: 'Overdue', color: colors.negative },
  paid:     { label: 'Paid',    color: colors.positive },
  pending:  { label: 'Pending', color: colors.labelSecondary },
};

export function Badge({ status }: { status: DebtStatus }) {
  const { label, color } = CONFIG[status];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  label: { ...type.caption2, fontWeight: '500' },
});
