import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, HandCoins, Receipt } from 'lucide-react-native';
import { formatActivityDate } from '@/features/group-expense/activityFeed';
import type { ActivityItem, ActivityKind } from '@/features/group-expense/types';
import { useCurrency } from '@/hooks/useCurrency';
import { minorToMajor } from '@/features/debts/money';
import { useGlassSurfacePressed } from '@/lib/glassSurface';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';

interface ActivityFeedItemProps {
  item: ActivityItem;
  onPress?: () => void;
}

function isExpenseKind(kind: ActivityKind): boolean {
  return kind === 'expense_added' || kind === 'expense_edited';
}

function isMutedKind(kind: ActivityKind): boolean {
  return kind === 'settlement_recorded' || kind === 'expense_deleted';
}

function createStyles(palette: ColorPalette, rowPressedColor: string) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      gap: space[3],
      minHeight: 64,
    },
    rowExpense: {
      minHeight: 68,
    },
    rowMuted: {
      minHeight: 52,
      paddingVertical: space[3],
      opacity: 0.72,
    },
    rowPressed: { backgroundColor: rowPressedColor },
    iconTrack: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.fill,
    },
    iconTrackExpense: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: palette.tintMuted,
    },
    iconTrackMuted: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    body: { flex: 1, minWidth: 0, gap: 2 },
    expenseLabel: {
      ...type.caption2,
      fontWeight: '600',
      color: palette.tint,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    title: {
      ...type.subheadline,
      fontWeight: '500',
      color: palette.label,
    },
    titleExpense: {
      ...type.headline,
      fontWeight: '600',
      color: palette.label,
    },
    titleMuted: {
      ...type.footnote,
      fontWeight: '400',
      color: palette.labelSecondary,
    },
    meta: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    metaExpense: {
      ...type.subheadline,
      color: palette.labelSecondary,
    },
    amount: {
      ...type.callout,
      fontWeight: '600',
      color: palette.label,
    },
    amountExpense: {
      ...type.headline,
      fontWeight: '600',
      color: palette.label,
    },
    amountMuted: {
      ...type.footnote,
      fontWeight: '500',
      color: palette.labelTertiary,
    },
    chevron: {
      marginLeft: space[1],
    },
  });
}

export function ActivityFeedItem({ item, onPress }: ActivityFeedItemProps) {
  const palette = useColors();
  const rowPressedColor = useGlassSurfacePressed();
  const styles = useMemo(
    () => createStyles(palette, rowPressedColor),
    [palette, rowPressedColor]
  );
  const { fmt } = useCurrency();

  const isExpense = isExpenseKind(item.kind);
  const isMuted = isMutedKind(item.kind);
  const isSettlement = item.kind === 'settlement_recorded';
  const Icon = isSettlement ? HandCoins : Receipt;

  const handlePress = useCallback(() => {
    if (!onPress) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const accessibilityLabel = isExpense
    ? `Expense ${item.title}, ${item.amountMinor != null ? fmt(minorToMajor(item.amountMinor)) : ''}, ${item.subtitle ?? ''}, double tap to edit`
    : item.title;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isExpense && styles.rowExpense,
        isMuted && styles.rowMuted,
        pressed && onPress && styles.rowPressed,
      ]}
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.iconTrack,
          isExpense && styles.iconTrackExpense,
          isMuted && styles.iconTrackMuted,
        ]}
      >
        <Icon
          size={isExpense ? 20 : 16}
          color={isExpense ? palette.tint : palette.labelTertiary}
        />
      </View>
      <View style={styles.body}>
        {isExpense ? <Text style={styles.expenseLabel}>Expense</Text> : null}
        <Text
          style={[styles.title, isExpense && styles.titleExpense, isMuted && styles.titleMuted]}
          numberOfLines={isExpense ? 1 : 2}
        >
          {item.title}
        </Text>
        <Text style={isExpense ? styles.metaExpense : styles.meta} numberOfLines={1}>
          {isExpense ? item.subtitle : formatActivityDate(item.at)}
        </Text>
        {isExpense ? (
          <Text style={styles.meta}>{formatActivityDate(item.at)}</Text>
        ) : null}
      </View>
      {item.amountMinor != null ? (
        <Text
          style={[
            styles.amount,
            isExpense && styles.amountExpense,
            isMuted && styles.amountMuted,
          ]}
        >
          {fmt(minorToMajor(item.amountMinor))}
        </Text>
      ) : null}
      {isExpense && onPress ? (
        <ChevronRight
          size={18}
          color={palette.labelTertiary}
          style={styles.chevron}
        />
      ) : null}
    </Pressable>
  );
}
