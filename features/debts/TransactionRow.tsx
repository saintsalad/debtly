import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Debt } from '@/features/debts/types';
import { Avatar } from '@/components/ui/Avatar';
import { ListDivider } from '@/components/ui/ListDivider';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';

interface TransactionRowProps {
  debt: Debt;
  onPress: () => void;
  showSeparator?: boolean;
}

function createStyles(palette: ColorPalette) {
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
      backgroundColor: palette.fill,
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
    amount: {
      ...type.callout,
      fontWeight: '600',
      color: palette.label,
    },
    note: {
      ...type.footnote,
      color: palette.labelSecondary,
      flex: 1,
    },
    status: {
      ...type.caption1,
      color: palette.labelTertiary,
    },
    statusOverdue: {
      color: palette.negative,
    },
    statusPaid: {
      color: palette.labelSecondary,
    },
  });
}

export function TransactionRow({ debt, onPress, showSeparator = false }: TransactionRowProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { fmt } = useCurrency();
  const status = getComputedStatus(debt);
  const isCredit = debt.type === 'owed_to_me';

  const statusLabel =
    status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Pending';

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={handlePress}
        android_ripple={{ color: palette.fill, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={`${debt.personName}, ${isCredit ? 'owes you' : 'you owe'} ${fmt(debt.amount)}`}
      >
        <Avatar name={debt.personName} size={40} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {debt.personName}
            </Text>
            <Text style={styles.amount}>
              {isCredit ? '+' : '−'}{fmt(debt.amount)}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.note} numberOfLines={1}>
              {debt.note || (isCredit ? 'Owes you' : 'You owe')}
            </Text>
            <Text
              style={[
                styles.status,
                status === 'overdue' && styles.statusOverdue,
                status === 'paid' && styles.statusPaid,
              ]}
            >
              {debt.dueDate && status !== 'paid'
                ? `Due ${formatDate(debt.dueDate)}`
                : statusLabel}
            </Text>
          </View>
        </View>
      </Pressable>
      {showSeparator ? <ListDivider /> : null}
    </>
  );
}
