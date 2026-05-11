import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Debt } from '@/features/debts/types';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { colors, space, type } from '@/lib/platform';

interface TransactionRowProps {
  debt: Debt;
  onPress: () => void;
  showSeparator?: boolean;
}

export function TransactionRow({ debt, onPress, showSeparator = false }: TransactionRowProps) {
  const { fmt } = useCurrency();
  const status = getComputedStatus(debt);
  const isCredit = debt.type === 'owed_to_me';

  const statusLabel =
    status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Pending';

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onPress}
        android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }}
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
      {showSeparator && <View style={styles.separator} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[4],
    gap: space[3],
  },
  rowPressed: {
    opacity: 0.88,
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
    color: colors.label,
    flex: 1,
  },
  amount: {
    ...type.callout,
    fontWeight: '600',
    color: colors.label,
  },
  note: {
    ...type.footnote,
    color: colors.labelSecondary,
    flex: 1,
  },
  status: {
    ...type.caption1,
    color: colors.labelTertiary,
  },
  statusOverdue: {
    color: colors.negative,
  },
  statusPaid: {
    color: colors.labelSecondary,
  },
  separator: {
    marginLeft: space[4] + 40 + space[3],
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
});
