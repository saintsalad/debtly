import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Debt } from '@/features/debts/types';
import {
  getRemainingBalance,
  getSettledDisplayAmount,
  getTotalPaid,
} from '@/features/debts/debtCalculations';
import { Avatar } from '@/components/ui/Avatar';
import { ListDivider } from '@/components/ui/ListDivider';
import { useCurrency } from '@/hooks/useCurrency';
import { dueUrgencyBadgeColors } from '@/features/debts/dueUrgencyBadge';
import { formatDate, getTransactionDuePresentation } from '@/lib/utils';
import { useGlassSurfacePressed } from '@/lib/glassSurface';
import { useColors, radius, space, type, type ColorPalette } from '@/lib/platform';

interface TransactionRowProps {
  debt: Debt;
  onPress: () => void;
  showSeparator?: boolean;
  dividerVariant?: 'default' | 'glass';
}

function createStyles(palette: ColorPalette, rowPressedColor: string) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      gap: space[3],
      minHeight: 68,
    },
    rowPressed: {
      backgroundColor: rowPressedColor,
    },
    body: { flex: 1, gap: space[1] },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[2],
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[2],
    },
    name: {
      ...type.subheadline,
      fontWeight: '500',
      color: palette.label,
      flex: 1,
    },
    namePaid: {
      color: palette.labelSecondary,
      fontWeight: '500',
    },
    amount: {
      ...type.callout,
      fontWeight: '600',
      color: palette.label,
    },
    amountPaid: {
      color: palette.labelSecondary,
      fontWeight: '500',
      textDecorationLine: 'line-through',
    },
    note: {
      ...type.footnote,
      color: palette.labelSecondary,
      flex: 1,
    },
    notePaid: {
      color: palette.labelTertiary,
    },
    statusPlain: {
      ...type.caption1,
      color: palette.labelTertiary,
      flexShrink: 0,
      maxWidth: '48%',
      textAlign: 'right',
    },
    statusPending: {
      color: palette.labelSecondary,
    },
    statusPaid: {
      color: palette.labelTertiary,
      fontWeight: '400',
    },
    statusBadge: {
      flexShrink: 0,
      paddingHorizontal: space[2],
      paddingVertical: 4,
      borderRadius: radius.sm,
      maxWidth: '52%',
    },
    statusBadgeLabel: {
      ...type.caption1,
      textAlign: 'center',
    },
  });
}

export function TransactionRow({
  debt,
  onPress,
  showSeparator = false,
  dividerVariant = 'default',
}: TransactionRowProps) {
  const palette = useColors();
  const rowPressedColor = useGlassSurfacePressed();
  const styles = useMemo(() => createStyles(palette, rowPressedColor), [palette, rowPressedColor]);
  const { fmt } = useCurrency();
  const dueUI = useMemo(() => getTransactionDuePresentation(debt), [debt]);
  const badgeColors = useMemo(
    () => dueUrgencyBadgeColors(palette, dueUI.tone),
    [palette, dueUI.tone]
  );

  const isCredit = debt.type === 'owed_to_me';
  const remainingBalance = getRemainingBalance(debt);
  const settledAmount = getSettledDisplayAmount(debt);
  const totalPaid = getTotalPaid(debt);
  const isPaid = dueUI.tone === 'paid';
  const displayAmount = isPaid ? settledAmount : remainingBalance;

  const avatarTone = isCredit ? 'credit' : 'debit';

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const accessibilityHint =
    debt.dueDate && !isPaid ? `Calendar due date ${formatDate(debt.dueDate)}` : undefined;

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={handlePress}
        android_ripple={{ color: palette.fill, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={
          isPaid
            ? `${debt.personName}, paid ${fmt(settledAmount)}${dueUI.label ? `, ${dueUI.label}` : ''}`
            : `${debt.personName}, ${isCredit ? '+' : '−'}${fmt(remainingBalance)}${dueUI.label ? `, ${dueUI.label}` : ''}`
        }
        accessibilityHint={accessibilityHint}
      >
        <Avatar name={debt.personName} seed={debt.id} size={40} tone={avatarTone} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.name, isPaid && styles.namePaid]} numberOfLines={1}>
              {debt.personName}
            </Text>
            <Text style={[styles.amount, isPaid && styles.amountPaid]}>
              {isPaid ? fmt(displayAmount) : `${isCredit ? '+' : '−'}${fmt(displayAmount)}`}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.note, isPaid && styles.notePaid]} numberOfLines={1}>
              {debt.note || (totalPaid > 0 ? `${fmt(totalPaid)} paid` : '')}
            </Text>
            {badgeColors ? (
              <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
                <Text
                  style={[
                    styles.statusBadgeLabel,
                    { color: badgeColors.fg, fontWeight: badgeColors.fontWeight },
                  ]}
                  numberOfLines={2}
                >
                  {dueUI.label}
                </Text>
              </View>
            ) : dueUI.label ? (
              <Text
                style={[
                  styles.statusPlain,
                  dueUI.tone === 'paid' && styles.statusPaid,
                  dueUI.tone === 'pending_no_due' && styles.statusPending,
                ]}
                numberOfLines={2}
              >
                {dueUI.label}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      {showSeparator ? <ListDivider variant={dividerVariant} /> : null}
    </>
  );
}
