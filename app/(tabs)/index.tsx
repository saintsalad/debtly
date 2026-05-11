import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Avatar } from '@/components/ui/Avatar';
import { useDebtSummary } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';
import { useCurrency } from '@/hooks/useCurrency';
import { colors, type, space, radius, cardShadow } from '@/lib/platform';
import { formatDate, getComputedStatus } from '@/lib/utils';

export default function HomeScreen() {
  const { debts, owedToMe, iOwe, totalOwedToMe, totalIOwe, settledCount } = useDebtSummary();
  const name = useProfileStore((s) => s.name);
  const { fmt } = useCurrency();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const netBalance = totalOwedToMe - totalIOwe;
  const isPositive = netBalance >= 0;

  const overdueCount = useMemo(
    () => debts.filter((d) => getComputedStatus(d) === 'overdue').length,
    [debts]
  );

  const recentDebts = useMemo(
    () =>
      [...debts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [debts]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name}>{name}</Text>
          </View>
        </View>

        {/* Net Balance */}
        <View style={[styles.netCard, { borderTopColor: isPositive ? colors.positive : colors.negative }]}>
          <Text style={styles.netLabel}>Net Balance</Text>
          <Text style={[styles.netAmount, { color: isPositive ? colors.positive : colors.negative }]}>
            {isPositive ? '+' : '−'}{fmt(Math.abs(netBalance))}
          </Text>
          <Text style={styles.netSub}>
            {isPositive ? "You're receiving more than you owe" : "You owe more than you're owed"}
          </Text>
        </View>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryReceivable]}>
            <View style={styles.summaryIconWrap}>
              <MaterialIcons name="arrow-downward" size={16} color={colors.positive} />
            </View>
            <Text style={styles.summaryLabel}>Receivable</Text>
            <Text style={[styles.summaryAmount, { color: colors.positive }]}>
              {fmt(totalOwedToMe)}
            </Text>
            <Text style={styles.summaryCount}>{owedToMe.length} pending</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryPayable]}>
            <View style={styles.summaryIconWrap}>
              <MaterialIcons name="arrow-upward" size={16} color={colors.negative} />
            </View>
            <Text style={styles.summaryLabel}>Payable</Text>
            <Text style={[styles.summaryAmount, { color: colors.negative }]}>
              {fmt(totalIOwe)}
            </Text>
            <Text style={styles.summaryCount}>{iOwe.length} pending</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <MaterialIcons name="check-circle-outline" size={22} color={colors.positive} />
            <Text style={styles.statValue}>{settledCount}</Text>
            <Text style={styles.statLabel}>Settled</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons
              name="warning-amber"
              size={22}
              color={overdueCount > 0 ? colors.warning : colors.labelTertiary}
            />
            <Text style={[styles.statValue, overdueCount > 0 && { color: colors.warning }]}>
              {overdueCount}
            </Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="people-outline" size={22} color={colors.tint} />
            <Text style={styles.statValue}>{owedToMe.length + iOwe.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Recent Activity */}
        {recentDebts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.recentCard}>
              {recentDebts.map((debt, index) => {
                const status = getComputedStatus(debt);
                const isCredit = debt.type === 'owed_to_me';
                const amountColor =
                  status === 'paid'
                    ? colors.labelTertiary
                    : isCredit
                    ? colors.positive
                    : colors.negative;

                return (
                  <View key={debt.id}>
                    <View style={styles.recentItem}>
                      <Avatar name={debt.personName} size={38} />
                      <View style={styles.recentBody}>
                        <Text style={styles.recentName} numberOfLines={1}>
                          {debt.personName}
                        </Text>
                        <Text style={styles.recentNote} numberOfLines={1}>
                          {debt.note || (isCredit ? 'Owes you' : 'You owe')}
                        </Text>
                      </View>
                      <View style={styles.recentRight}>
                        <Text style={[styles.recentAmount, { color: amountColor }]}>
                          {isCredit ? '+' : '−'}{fmt(debt.amount)}
                        </Text>
                        {status === 'paid' ? (
                          <Text style={[styles.recentMeta, { color: colors.positive }]}>
                            Paid
                          </Text>
                        ) : debt.dueDate ? (
                          <Text
                            style={[
                              styles.recentMeta,
                              { color: status === 'overdue' ? colors.negative : colors.labelTertiary },
                            ]}
                          >
                            {formatDate(debt.dueDate)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {index < recentDebts.length - 1 && <View style={styles.recentSep} />}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="account-balance-wallet" size={52} color={colors.labelTertiary} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first debt</Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 120 },

  header: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[5],
  },
  greeting: {
    ...type.footnote,
    color: colors.labelSecondary,
    marginBottom: 2,
  },
  name: {
    ...type.title1,
    color: colors.label,
  },

  // Net balance card
  netCard: {
    marginHorizontal: space[5],
    marginBottom: space[4],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space[5],
    alignItems: 'center',
    borderTopWidth: 3,
    ...cardShadow,
  },
  netLabel: {
    ...type.caption1,
    color: colors.labelSecondary,
    marginBottom: space[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netAmount: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1.5,
    marginBottom: 6,
  },
  netSub: {
    ...type.caption1,
    color: colors.labelTertiary,
    textAlign: 'center',
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: space[5],
    gap: space[3],
    marginBottom: space[4],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: space[4],
    ...cardShadow,
  },
  summaryReceivable: {
    borderLeftWidth: 3,
    borderLeftColor: colors.positive,
  },
  summaryPayable: {
    borderLeftWidth: 3,
    borderLeftColor: colors.negative,
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[2],
  },
  summaryLabel: {
    ...type.caption1,
    color: colors.labelSecondary,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  summaryCount: {
    ...type.caption2,
    color: colors.labelTertiary,
  },

  // Quick stats
  statsCard: {
    marginHorizontal: space[5],
    marginBottom: space[5],
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[4],
    ...cardShadow,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 44,
    backgroundColor: colors.opaqueSeparator,
  },
  statValue: {
    ...type.title3,
    color: colors.label,
  },
  statLabel: {
    ...type.caption2,
    color: colors.labelSecondary,
  },

  // Recent activity
  section: {
    paddingHorizontal: space[5],
  },
  sectionTitle: {
    ...type.headline,
    color: colors.label,
    marginBottom: space[3],
  },
  recentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...cardShadow,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: 13,
    gap: space[3],
  },
  recentBody: { flex: 1, gap: 3 },
  recentName: {
    ...type.subheadline,
    fontWeight: '500',
    color: colors.label,
  },
  recentNote: {
    ...type.caption1,
    color: colors.labelSecondary,
  },
  recentRight: { alignItems: 'flex-end', gap: 3 },
  recentAmount: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  recentMeta: {
    ...type.caption2,
  },
  recentSep: {
    marginLeft: space[4] + 38 + space[3],
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.opaqueSeparator,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: space[12],
    paddingBottom: space[8],
    gap: space[2],
  },
  emptyTitle: {
    ...type.headline,
    color: colors.labelSecondary,
    marginTop: space[2],
  },
  emptySubtitle: {
    ...type.footnote,
    color: colors.labelTertiary,
  },
});
