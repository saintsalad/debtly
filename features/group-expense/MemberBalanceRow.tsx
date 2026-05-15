import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui/Avatar';
import type { MemberBalance } from '@/features/group-expense/types';
import { useCurrency } from '@/hooks/useCurrency';
import { minorToMajor } from '@/features/debts/money';
import { useGlassSurfacePressed } from '@/lib/glassSurface';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';

interface MemberBalanceRowProps {
  balance: MemberBalance;
  onRemind?: () => void;
}

function createStyles(palette: ColorPalette, rowPressedColor: string) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      gap: space[3],
      minHeight: 56,
    },
    rowPressed: { backgroundColor: rowPressedColor },
    body: { flex: 1, minWidth: 0, gap: 2 },
    name: {
      ...type.subheadline,
      fontWeight: '500',
      color: palette.label,
    },
    sub: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    amount: {
      ...type.callout,
      fontWeight: '600',
    },
    positive: { color: palette.positive },
    negative: { color: palette.negative },
    neutral: { color: palette.labelTertiary },
  });
}

export function MemberBalanceRow({ balance, onRemind }: MemberBalanceRowProps) {
  const palette = useColors();
  const rowPressedColor = useGlassSurfacePressed();
  const styles = useMemo(
    () => createStyles(palette, rowPressedColor),
    [palette, rowPressedColor]
  );
  const { fmt } = useCurrency();

  const handlePress = useCallback(() => {
    if (!onRemind) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemind();
  }, [onRemind]);

  if (balance.isCurrentUser) {
    return (
      <View style={styles.row}>
        <Avatar name={balance.displayName} size={40} />
        <View style={styles.body}>
          <Text style={styles.name}>{balance.displayName}</Text>
          <Text style={styles.sub}>You</Text>
        </View>
      </View>
    );
  }

  const label =
    balance.netMinor > 0
      ? `owes you ${fmt(minorToMajor(balance.netMinor))}`
      : balance.netMinor < 0
        ? `you owe ${fmt(minorToMajor(Math.abs(balance.netMinor)))}`
        : 'settled up';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onRemind && styles.rowPressed]}
      onPress={onRemind ? handlePress : undefined}
      disabled={!onRemind || balance.netMinor === 0}
    >
      <Avatar
        name={balance.displayName}
        size={40}
        tone={balance.netMinor > 0 ? 'credit' : balance.netMinor < 0 ? 'debit' : undefined}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {balance.displayName}
        </Text>
        <Text
          style={[
            styles.sub,
            balance.netMinor > 0
              ? styles.positive
              : balance.netMinor < 0
                ? styles.negative
                : styles.neutral,
          ]}
        >
          {label}
          {onRemind && balance.netMinor !== 0 ? ' · tap to remind' : ''}
        </Text>
      </View>
      {balance.netMinor !== 0 ? (
        <Text
          style={[
            styles.amount,
            balance.netMinor > 0 ? styles.positive : styles.negative,
          ]}
        >
          {fmt(minorToMajor(Math.abs(balance.netMinor)))}
        </Text>
      ) : null}
    </Pressable>
  );
}
