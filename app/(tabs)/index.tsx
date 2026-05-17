import React, { useCallback, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { AppScreen } from '@/components/ui/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { InsightsCard } from '@/components/ui/InsightsCard';
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
import { getComputedStatus } from '@/lib/utils';
import { useColors, layout, type, space, type ColorPalette } from '@/lib/platform';
import { useStatusBarScrollFade } from '@/lib/statusBarScrollFade';
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

function createStyles(palette: ColorPalette, scrollBottomPadding: number) {
  return StyleSheet.create({
    content: {
      paddingBottom: scrollBottomPadding,
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

    section: {
      paddingHorizontal: space[4],
      marginBottom: space[8],
    },
    sectionTitle: {
      ...type.headline,
      color: palette.label,
      marginBottom: space[3],
    },
    recentCard: {},
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const palette = useColors();
  const scrollBottomPadding =
    Platform.OS === 'ios' ? layout.screenPaddingBottom : 0;
  const styles = useMemo(
    () => createStyles(palette, scrollBottomPadding),
    [palette, scrollBottomPadding]
  );
  const { debts, owedToMe, iOwe, totalOwedToMe, totalIOwe } = useDebtSummary();
  const name = useProfileStore((s) => s.name);
  const { fmt } = useCurrency();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const entriesThisYear = useMemo(() => {
    const year = new Date().getFullYear();
    return debts.filter((d) => new Date(d.createdAt).getFullYear() === year).length;
  }, [debts]);

  const recentDebts = useMemo(
    () =>
      [...debts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [debts]
  );

  const upcomingDueDebts = useMemo(() => {
    return [...debts]
      .filter((d) => d.dueDate && getComputedStatus(d) !== 'paid')
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )
      .slice(0, 3);
  }, [debts]);

  const insightsStyle = useFadeUp(0);
  const insets = useSafeAreaInsets();
  const { open: openTransactionDetail } = useTransactionDetail();
  const { onScroll: statusBarScrollFadeOnScroll } = useStatusBarScrollFade();

  useFocusEffect(
    useCallback(() => {
      void SystemUI.setBackgroundColorAsync('transparent');
    }, [])
  );

  return (
    <AppScreen reserveTabBarInset={false}>
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

        <Animated.View style={[styles.section, insightsStyle]}>
          <InsightsCard
            entriesThisYear={entriesThisYear}
            totalOwedToMe={totalOwedToMe}
            totalIOwe={totalIOwe}
            receivablePending={owedToMe.length}
            payablePending={iOwe.length}
            fmt={fmt}
            onPress={() => router.push('/insights')}
          />
        </Animated.View>

        {upcomingDueDebts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming dues</Text>
            <GlassCard style={styles.recentCard}>
              {upcomingDueDebts.map((debt, index) => (
                <TransactionRow
                  key={debt.id}
                  debt={debt}
                  onPress={() => openTransactionDetail(debt)}
                  showSeparator={index < upcomingDueDebts.length - 1}
                  dividerVariant="glass"
                />
              ))}
            </GlassCard>
          </View>
        ) : null}

        {recentDebts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <GlassCard style={styles.recentCard}>
              {recentDebts.map((debt, index) => (
                <TransactionRow
                  key={debt.id}
                  debt={debt}
                  onPress={() => openTransactionDetail(debt)}
                  showSeparator={index < recentDebts.length - 1}
                  dividerVariant="glass"
                />
              ))}
            </GlassCard>
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

