import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassButton } from '@/components/ui/GlassButton';
import { space, useColors } from '@/lib/platform';

interface GroupQuickActionsProps {
  onAddExpense: () => void;
  onSettle: () => void;
  /** You have no pairwise balance with anyone (settle tap shows “all settled” instead of opening the sheet). */
  settleWithEveryoneClear?: boolean;
}

export function GroupQuickActions({
  onAddExpense,
  onSettle,
  settleWithEveryoneClear = false,
}: GroupQuickActionsProps) {
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
        <GlassButton
          variant="secondary"
          onPress={onSettle}
          style={{ opacity: settleWithEveryoneClear ? 0.52 : 1 }}
        >
          <GlassButton.Label>Settle up</GlassButton.Label>
        </GlassButton>
      </View>
    </View>
  );
}
