import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip } from 'heroui-native';
import { Debt } from '@/features/debts/types';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { cardShadow, colors, radius, space, type } from '@/lib/platform';

interface TransactionRowProps {
  debt: Debt;
  onPress: () => void;
}

export function TransactionRow({ debt, onPress }: TransactionRowProps) {
  const { fmt } = useCurrency();
  const status = getComputedStatus(debt);
  const isCredit = debt.type === 'owed_to_me';

  const amountColor =
    status === 'paid'
      ? colors.labelTertiary
      : isCredit
      ? colors.positive
      : colors.negative;

  const chipColor: 'success' | 'danger' | 'default' =
    status === 'paid' ? 'success' : status === 'overdue' ? 'danger' : 'default';

  const chipLabel = status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Pending';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.04)', borderless: false }}
    >
      {/* Colored type indicator strip */}
      <View
        style={[
          styles.strip,
          { backgroundColor: status === 'paid' ? colors.labelTertiary : isCredit ? colors.positive : colors.negative },
        ]}
      />

      <View style={styles.inner}>
        <Avatar name={debt.personName} size={44} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {debt.personName}
            </Text>
            <Text style={[styles.amount, { color: amountColor }]}>
              {isCredit ? '+' : '−'}{fmt(debt.amount)}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.note} numberOfLines={1}>
                {debt.note || (isCredit ? 'Owes you' : 'You owe')}
              </Text>
              {debt.dueDate && status !== 'paid' && (
                <Text
                  style={[
                    styles.dueDate,
                    { color: status === 'overdue' ? colors.negative : colors.labelTertiary },
                  ]}
                >
                  Due {formatDate(debt.dueDate)}
                </Text>
              )}
            </View>
            <Chip variant="soft" size="sm" color={chipColor} animation="disable-all">
              {chipLabel}
            </Chip>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    flexDirection: 'row',
    overflow: 'hidden',
    ...cardShadow,
  },
  cardPressed: {
    opacity: 0.88,
  },
  strip: {
    width: 4,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: 14,
    gap: space[3],
  },
  body: { flex: 1, gap: 7 },
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
    fontWeight: '600',
    color: colors.label,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metaLeft: { flex: 1, gap: 2 },
  note: {
    ...type.caption1,
    color: colors.labelSecondary,
  },
  dueDate: {
    ...type.caption2,
  },
});
