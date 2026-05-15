import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton } from '@/components/ui/GlassButton';
import { space, useColors } from '@/lib/platform';

interface GroupQuickActionsProps {
  onAddExpense: () => void;
  onSettle: () => void;
}

export function GroupQuickActions({ onAddExpense, onSettle }: GroupQuickActionsProps) {
  useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          gap: space[2],
        },
        action: { flex: 1 },
      }),
    []
  );

  return (
    <View style={styles.row}>
      <View style={styles.action}>
        <GlassButton variant="primary" onPress={onAddExpense}>
          <GlassButton.Label>Add expense</GlassButton.Label>
        </GlassButton>
      </View>
      <View style={styles.action}>
        <GlassButton variant="secondary" onPress={onSettle}>
          <GlassButton.Label>Settle up</GlassButton.Label>
        </GlassButton>
      </View>
    </View>
  );
}
