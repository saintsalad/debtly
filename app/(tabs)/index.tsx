import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Wallet } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebtSummary } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';
import { useCurrency } from '@/hooks/useCurrency';
import { colors, type, space, radius, cardShadow } from '@/lib/platform';
import { formatDate, getComputedStatus } from '@/lib/utils';

function useFadeUp(delay = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 240 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 24, stiffness: 190 }));
  }, [delay, opacity, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

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

  const activeCount = owedToMe.length + iOwe.length;
  const heroStyle = useFadeUp(0);
  const overviewStyle = useFadeUp(50);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>

        <Animated.View style={[styles.netCard, heroStyle]}>
          <Text style={styles.netLabel}>Net balance</Text>
          <Text style={[styles.netAmount, { color: isPositive ? colors.positive : colors.negative }]}>
            {isPositive ? '+' : '−'}{fmt(Math.abs(netBalance))}
          </Text>
          <Text style={styles.netSub}>
            {isPositive ? "You're receiving more than you owe" : "You owe more than you're owed"}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.overviewCard, overviewStyle]}>
          <View style={styles.overviewHalf}>
            <Text style={styles.overviewLabel}>Receivable</Text>
            <Text style={[styles.overviewAmount, { color: colors.positive }]}>
              {fmt(totalOwedToMe)}
            </Text>
            <Text style={styles.overviewMeta}>{owedToMe.length} pending</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewHalf}>
            <Text style={styles.overviewLabel}>Payable</Text>
            <Text style={[styles.overviewAmount, { color: colors.negative }]}>
              {fmt(totalIOwe)}
            </Text>
            <Text style={styles.overviewMeta}>{iOwe.length} pending</Text>
          </View>
        </Animated.View>

        <Text style={styles.statusLine}>
          {settledCount} settled · {overdueCount} overdue · {activeCount} active
        </Text>

        {recentDebts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
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
                      <Avatar name={debt.personName} size={40} />
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
                          <Text style={styles.recentMeta}>Paid</Text>
                        ) : debt.dueDate ? (
                          <Text
                            style={[
                              styles.recentMeta,
                              status === 'overdue' && styles.recentMetaOverdue,
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
          <EmptyState
            title="No transactions yet"
            subtitle="Tap + to add your first debt."
            icon={<Wallet size={40} color={colors.labelTertiary} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 120 },

  header: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[6],
  },
  greeting: {
    ...type.footnote,
    color: colors.labelSecondary,
    marginBottom: space[1],
  },
  name: {
    ...type.largeTitle,
    fontWeight: '600',
    color: colors.label,
  },

  netCard: {
    marginHorizontal: space[4],
    marginBottom: space[6],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: space[5],
    paddingVertical: space[6],
    alignItems: 'center',
    ...cardShadow,
  },
  netLabel: {
    ...type.subheadline,
    color: colors.labelSecondary,
    marginBottom: space[2],
  },
  netAmount: {
    ...type.title1,
    fontWeight: '600',
    marginBottom: space[2],
  },
  netSub: {
    ...type.footnote,
    color: colors.labelSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  overviewCard: {
    marginHorizontal: space[4],
    marginBottom: space[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: space[5],
    ...cardShadow,
  },
  overviewHalf: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: space[3],
    gap: space[1],
  },
  overviewDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: space[1],
  },
  overviewLabel: {
    ...type.footnote,
    color: colors.labelSecondary,
  },
  overviewAmount: {
    ...type.title3,
    fontWeight: '600',
  },
  overviewMeta: {
    ...type.caption1,
    color: colors.labelTertiary,
  },

  statusLine: {
    ...type.caption1,
    color: colors.labelSecondary,
    textAlign: 'center',
    marginBottom: space[8],
    paddingHorizontal: space[4],
  },

  section: {
    paddingHorizontal: space[4],
  },
  sectionTitle: {
    ...type.headline,
    color: colors.label,
    marginBottom: space[3],
  },
  recentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...cardShadow,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[4],
    gap: space[3],
  },
  recentBody: { flex: 1, gap: space[1] },
  recentName: {
    ...type.subheadline,
    fontWeight: '500',
    color: colors.label,
  },
  recentNote: {
    ...type.footnote,
    color: colors.labelSecondary,
  },
  recentRight: { alignItems: 'flex-end', gap: space[1] },
  recentAmount: {
    ...type.callout,
    fontWeight: '600',
    color: colors.label,
  },
  recentMeta: {
    ...type.caption1,
    color: colors.labelTertiary,
  },
  recentMetaOverdue: {
    color: colors.negative,
  },
  recentSep: {
    marginLeft: space[4] + 40 + space[3],
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
});
