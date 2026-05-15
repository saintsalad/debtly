import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { AppScreen } from '@/components/ui/AppScreen';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Wallet } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionRow } from '@/features/debts/TransactionRow';
import { useDebtSummary } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';
import { useCurrency } from '@/hooks/useCurrency';
import { useCardShadow, useColors, layout, type, space, radius, type ColorPalette } from '@/lib/platform';
import { useStatusBarScrollFade } from '@/lib/statusBarScrollFade';
import { getComputedStatus } from '@/lib/utils';
import { useTransactionDetail } from '@/lib/transactionDetailContext';

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

function createStyles(palette: ColorPalette, shadow: ReturnType<typeof useCardShadow>) {
  return StyleSheet.create({
    content: {
      paddingBottom: layout.screenPaddingBottom,
    },

    header: {
      paddingHorizontal: space[4],
      paddingTop: space[4],
      paddingBottom: space[6],
    },
    greeting: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginBottom: space[1],
    },
    name: {
      ...type.largeTitle,
      fontWeight: '600',
      color: palette.label,
    },

    netCard: {
      marginHorizontal: space[4],
      marginBottom: space[6],
      backgroundColor: palette.surface,
      borderRadius: radius.xl,
      paddingHorizontal: space[5],
      paddingVertical: space[6],
      alignItems: 'center',
      ...shadow,
    },
    netLabel: {
      ...type.subheadline,
      color: palette.labelSecondary,
      marginBottom: space[2],
    },
    netAmount: {
      ...type.title1,
      fontWeight: '600',
      marginBottom: space[2],
    },
    netSub: {
      ...type.footnote,
      color: palette.labelSecondary,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },

    overviewCard: {
      marginHorizontal: space[4],
      marginBottom: space[3],
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingVertical: space[5],
      ...shadow,
    },
    overviewHalf: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: space[3],
      gap: space[1],
    },
    overviewDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: palette.separator,
      marginVertical: space[1],
    },
    overviewLabel: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    overviewAmount: {
      ...type.title3,
      fontWeight: '600',
    },
    overviewMeta: {
      ...type.caption1,
      color: palette.labelTertiary,
    },

    statusLine: {
      ...type.caption1,
      color: palette.labelSecondary,
      textAlign: 'center',
      marginBottom: space[8],
      paddingHorizontal: space[4],
    },

    section: {
      paddingHorizontal: space[4],
    },
    sectionTitle: {
      ...type.headline,
      color: palette.label,
      marginBottom: space[3],
    },
    recentCard: {
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadow,
    },
  });
}

export default function HomeScreen() {
  const palette = useColors();
  const shadow = useCardShadow();
  const styles = useMemo(() => createStyles(palette, shadow), [palette, shadow]);
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
  const insets = useSafeAreaInsets();
  const { open: openTransactionDetail } = useTransactionDetail();
  const { onScroll: statusBarScrollFadeOnScroll } = useStatusBarScrollFade();

  useFocusEffect(
    useCallback(() => {
      void SystemUI.setBackgroundColorAsync(palette.bg);
    }, [palette.bg])
  );

  return (
    <AppScreen>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={statusBarScrollFadeOnScroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>

        <Animated.View style={[styles.netCard, heroStyle]}>
          <Text style={styles.netLabel}>Net balance</Text>
          <Text style={[styles.netAmount, { color: isPositive ? palette.positive : palette.negative }]}>
            {isPositive ? '+' : '−'}{fmt(Math.abs(netBalance))}
          </Text>
          <Text style={styles.netSub}>
            {isPositive ? "You're receiving more than you owe" : "You owe more than you're owed"}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.overviewCard, overviewStyle]}>
          <View style={styles.overviewHalf}>
            <Text style={styles.overviewLabel}>Receivable</Text>
            <Text style={[styles.overviewAmount, { color: palette.positive }]}>
              {fmt(totalOwedToMe)}
            </Text>
            <Text style={styles.overviewMeta}>{owedToMe.length} pending</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewHalf}>
            <Text style={styles.overviewLabel}>Payable</Text>
            <Text style={[styles.overviewAmount, { color: palette.negative }]}>
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
              {recentDebts.map((debt, index) => (
                <TransactionRow
                  key={debt.id}
                  debt={debt}
                  onPress={() => openTransactionDetail(debt)}
                  showSeparator={index < recentDebts.length - 1}
                />
              ))}
            </View>
          </View>
        ) : (
          <EmptyState
            title="No transactions yet"
            subtitle="Tap + to add your first debt."
            icon={<Wallet size={40} color={palette.labelTertiary} />}
          />
        )}
      </Animated.ScrollView>
    </AppScreen>
  );
}

