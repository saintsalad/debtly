import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ScreenBlueGradient } from '@/components/ui/ScreenBlueGradient';
import { filterDebtsForTransactionsTab } from '@/features/debts/transactionList';
import {
  buildGroupExpenseInsights,
  buildTransactionInsights,
  formatCompactNumber,
} from '@/features/insights/transactionInsights';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Users, Wallet } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCurrency } from '@/hooks/useCurrency';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';
import {
  scrollContentLayerStyle,
  screenHeaderLayerStyle,
  StatusBarScrollFadeStrip,
  useStatusBarScrollFade,
} from '@/lib/statusBarScrollFade';
import { useDebtStore } from '@/stores/debtStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

const MONTH_AXIS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

const HEADER_ROW_MIN_HEIGHT = 36;

/** Main stats hero: deep violet → rich purple → vibrant indigo. */
const STATS_GRADIENT_COLORS = ['#1E1033', '#3B1D5C', '#5E35A8', '#7B4FD4'] as const;
const STATS_GRADIENT_LOCATIONS = [0, 0.32, 0.68, 1] as const;

/** Streak accent colors: rich coral-red and vibrant purple. */
const STREAK_PRIMARY = '#E05565';
const STREAK_PURPLE = '#A855F7';

/** Total paid tile: deep crimson → rich red. */
const TILE_TOTAL_PAID_COLORS = ['#4C1520', '#7D1D2E', '#B02A40', '#D93E54'] as const;
const TILE_TOTAL_PAID_LOCATIONS = [0, 0.35, 0.7, 1] as const;

/** People tile (dark): charcoal with subtle violet undertone. */
const TILE_PEOPLE_COLORS_DARK = ['#1A1620', '#252030', '#302840', '#3D3350'] as const;
const TILE_PEOPLE_LOCATIONS = [0, 0.4, 0.72, 1] as const;

/** Payments: warm coral → salmon. */
const TILE_PAYMENTS_COLORS = ['#5C2A2A', '#8B3D3D', '#C25555', '#E87070'] as const;
const TILE_PAYMENTS_LOCATIONS = [0, 0.35, 0.7, 1] as const;

/** Group expenses tile: deep teal → rich cyan. */
const TILE_GROUP_EXPENSES_COLORS = ['#0F2E2E', '#1A4A4A', '#2B6B6B', '#3D8B8B'] as const;
const TILE_GROUP_EXPENSES_LOCATIONS = [0, 0.35, 0.7, 1] as const;

/** Group settled tile: deep forest → rich emerald. */
const TILE_GROUP_SETTLED_COLORS = ['#142818', '#1F4025', '#2D5C35', '#3D7A48'] as const;
const TILE_GROUP_SETTLED_LOCATIONS = [0, 0.35, 0.7, 1] as const;

const ON_GRADIENT = '#FFFFFF';
const ON_GRADIENT_MUTED = 'rgba(255, 255, 255, 0.66)';

function createStyles(palette: ColorPalette) {
  const cardBase: ViewStyle = {
    borderRadius: radius.md,
    overflow: 'hidden',
  };

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scroll: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    insightsLayerStack: {
      flex: 1,
      position: 'relative',
    },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: space[4],
      paddingBottom: space[3],
      backgroundColor: 'transparent',
      ...screenHeaderLayerStyle,
    },
    scrollContent: {
      paddingHorizontal: space[4],
      gap: space[8],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    headerTitle: {
      ...type.title1,
      color: palette.label,
    },
    sectionHeading: {
      ...type.title3,
      color: palette.label,
      marginBottom: space[3],
    },

    streakRow: {
      flexDirection: 'row',
      gap: space[3],
      alignItems: 'stretch',
    },
    streakLeft: {
      ...cardBase,
      flex: 1.05,
      minHeight: 168,
      backgroundColor: palette.fillSecondary,
      padding: space[4],
      justifyContent: 'center',
    },
    streakRightCol: {
      flex: 1,
      gap: space[3],
      justifyContent: 'space-between',
    },
    streakSmallCard: {
      ...cardBase,
      flex: 1,
      backgroundColor: palette.fillSecondary,
      paddingHorizontal: space[3],
      paddingVertical: space[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 78,
    },
    streakMuted: {
      ...type.caption1,
      color: palette.labelSecondary,
      maxWidth: '58%',
      lineHeight: 16,
    },
    streakBigNum: {
      fontSize: 28,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    streakBigUnit: {
      ...type.caption2,
      fontWeight: '600',
      marginTop: 2,
    },
    streakHeroStrong: {
      ...type.title2,
      color: palette.label,
      textAlign: 'center',
    },
    streakHeroMuted: {
      ...type.caption1,
      color: palette.labelSecondary,
      textAlign: 'center',
      marginTop: space[2],
      lineHeight: 18,
    },

    yearlyCard: {
      ...cardBase,
      paddingHorizontal: space[4],
      paddingTop: space[4],
      paddingBottom: space[3],
      minHeight: 140,
    },
    yearlyRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space[4],
      marginBottom: space[3],
    },
    yearlyHero: {
      minWidth: 72,
      alignItems: 'flex-start',
    },
    yearlyHeroVal: {
      fontSize: 44,
      fontWeight: '700',
      color: ON_GRADIENT,
      fontVariant: ['tabular-nums'],
      letterSpacing: -1.5,
    },
    yearlyHeroLabel: {
      ...type.caption1,
      color: ON_GRADIENT_MUTED,
      marginTop: 4,
      lineHeight: 16,
    },
    yearlyChartWrap: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      height: 76,
      paddingHorizontal: 2,
    },
    barCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
    },
    barFill: {
      width: '100%',
      borderRadius: 2,
      minHeight: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
    },
    axisRow: {
      flexDirection: 'row',
      paddingHorizontal: 2,
      gap: 3,
    },
    axisCell: {
      flex: 1,
      alignItems: 'center',
    },
    axisLabel: {
      ...type.caption2,
      fontSize: 9,
      color: ON_GRADIENT_MUTED,
    },
    statsAxisCap: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    statsAxisCaption: {
      ...type.caption2,
      fontSize: 9,
      color: ON_GRADIENT_MUTED,
    },

    tilesRow: {
      flexDirection: 'row',
      gap: space[3],
      alignItems: 'center',
    },
    metricTilePlain: {
      flex: 1,
      minWidth: 0,
      aspectRatio: 1,
      ...cardBase,
      paddingVertical: space[2],
      paddingHorizontal: space[2],
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    /** Eyebrow + icon row, then centered value (People + Spent only). */
    metricTileWithIcon: {
      flex: 1,
      minWidth: 0,
      aspectRatio: 1,
      ...cardBase,
      paddingVertical: space[2],
      paddingHorizontal: space[2],
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: 4,
    },
    tileIconHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[2],
      minHeight: 16,
    },
    tileIconBadgeOnGradient: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    tileIconBadgeLight: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.06)',
    },
    tileHeroCentered: {
      alignSelf: 'center',
    },
    tileFooterCentered: {
      alignSelf: 'center',
    },
    tileEyebrow: {
      ...type.caption2,
      fontWeight: '600',
      color: ON_GRADIENT_MUTED,
    },
    tileHero: {
      fontSize: 26,
      fontWeight: '700',
      color: ON_GRADIENT,
      fontVariant: ['tabular-nums'],
    },
    tileFooter: {
      ...type.caption2,
      fontWeight: '500',
      color: ON_GRADIENT_MUTED,
    },
    peopleTileEyebrow: {
      ...type.caption2,
      fontWeight: '600',
      color: palette.labelSecondary,
    },
    peopleTileHero: {
      fontSize: 26,
      fontWeight: '700',
      color: palette.label,
      fontVariant: ['tabular-nums'],
    },
    peopleTileFooter: {
      ...type.caption2,
      fontWeight: '500',
      color: palette.labelSecondary,
    },
  });
}

interface InsightsScreenProps {
  onClose: () => void;
}

function MonthlyEntryBars({
  counts,
  styles,
}: {
  counts: number[];
  styles: ReturnType<typeof createStyles>;
}) {
  const max = Math.max(1, ...counts);
  const ceilMax = Math.ceil(max);

  return (
    <View style={styles.yearlyChartWrap}>
      <View style={styles.statsAxisCap}>
        <Text style={styles.statsAxisCaption}>{ceilMax}</Text>
        <Text style={styles.statsAxisCaption}>0</Text>
      </View>
      <View style={styles.barRow}>
        {counts.map((c, i) => {
          const h = Math.max(4, Math.round((c / max) * 68));
          return (
            <View key={`m-${MONTH_AXIS[i] ?? i}`} style={styles.barCell}>
              <View style={[styles.barFill, { height: h }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.axisRow}>
        {MONTH_AXIS.map((m) => (
          <View key={`lbl-${m}`} style={styles.axisCell}>
            <Text style={styles.axisLabel}>{m}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function InsightsScreen({ onClose }: InsightsScreenProps) {
  const colorScheme = useAppColorScheme();
  const palette = useColors();
  const insets = useSafeAreaInsets();
  const { symbol: currencySymbol } = useCurrency();
  const debts = useDebtStore((s) => s.debts);
  const showSplit = useProfileStore((s) => s.showSplitBillsInTransactions);
  const groups = useGroupExpenseStore((s) => s.groups);
  const expenses = useGroupExpenseStore((s) => s.expenses);
  const settlements = useGroupExpenseStore((s) => s.settlements);
  const styles = useMemo(() => createStyles(palette), [palette]);

  const visibleDebts = useMemo(
    () => filterDebtsForTransactionsTab(debts, showSplit),
    [debts, showSplit]
  );

  const insights = useMemo(() => buildTransactionInsights(visibleDebts), [visibleDebts]);

  const groupInsights = useMemo(
    () => buildGroupExpenseInsights({ groups, expenses, settlements }),
    [groups, expenses, settlements]
  );

  const totalPaidDisplay = useMemo(() => {
    const majorUnits = Math.floor(insights.totalPaidMinorThisYear / 100);
    return `${currencySymbol}${formatCompactNumber(majorUnits)}`;
  }, [insights.totalPaidMinorThisYear, currencySymbol]);

  const totalGroupSpentDisplay = useMemo(() => {
    const majorUnits = Math.floor(groupInsights.totalSpentMinorThisYear / 100);
    return `${currencySymbol}${formatCompactNumber(majorUnits)}`;
  }, [groupInsights.totalSpentMinorThisYear, currencySymbol]);

  const totalGroupSettledDisplay = useMemo(() => {
    const majorUnits = Math.floor(groupInsights.totalSettledMinorThisYear / 100);
    return `${currencySymbol}${formatCompactNumber(majorUnits)}`;
  }, [groupInsights.totalSettledMinorThisYear, currencySymbol]);

  const onBack = () => {
    void Haptics.selectionAsync();
    onClose();
  };

  const currentStreakMissing = insights.currentWeeklyStreak === 0;

  const { onScroll: insightsScrollFadeOnScroll } = useStatusBarScrollFade({ overlayHost: 'screen' });

  const scrollTopInset = useMemo(
    () => insets.top + space[3] + HEADER_ROW_MIN_HEIGHT + space[3] + space[2],
    [insets.top]
  );

  return (
    <View style={styles.screen}>
      <ScreenBlueGradient />
      <View style={styles.insightsLayerStack} collapsable={false}>
        <Animated.ScrollView
          style={[styles.scroll, scrollContentLayerStyle]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={insightsScrollFadeOnScroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: scrollTopInset,
              paddingBottom: insets.bottom + space[12],
            },
          ]}
        >
        <View>
          <Text style={styles.sectionHeading}>Streaks</Text>
          <View style={styles.streakRow}>
            <View style={styles.streakLeft}>
              {currentStreakMissing ? (
                <>
                  <Text style={styles.streakHeroStrong}>No current streak</Text>
                  <Text style={styles.streakHeroMuted}>
                    Log activity at least once a week to build a streak.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.streakHeroStrong, { textAlign: 'center', width: '100%' }]}>
                    {insights.currentWeeklyStreak} week
                    {insights.currentWeeklyStreak === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.streakHeroMuted}>
                    Your consecutive weeks with ledger activity — keep going.
                  </Text>
                </>
              )}
            </View>
            <View style={styles.streakRightCol}>
              <View style={styles.streakSmallCard}>
                <Text style={styles.streakMuted}>Longest daily streak</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.streakBigNum, { color: STREAK_PRIMARY }]}>
                    {insights.longestDailyStreak}
                  </Text>
                  <Text style={[styles.streakBigUnit, { color: STREAK_PRIMARY }]}>
                    days
                  </Text>
                </View>
              </View>
              <View style={styles.streakSmallCard}>
                <Text style={styles.streakMuted}>Longest weekly streak</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.streakBigNum, { color: STREAK_PURPLE }]}>
                    {insights.longestWeeklyStreak}
                  </Text>
                  <Text style={[styles.streakBigUnit, { color: STREAK_PURPLE }]}>
                    weeks
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Stats</Text>
          <LinearGradient
            colors={[...STATS_GRADIENT_COLORS]}
            locations={[...STATS_GRADIENT_LOCATIONS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.yearlyCard}
          >
            <View style={styles.yearlyRow}>
              <View style={styles.yearlyHero}>
                <Text style={styles.yearlyHeroVal}>{insights.entriesThisYear}</Text>
                <Text style={styles.yearlyHeroLabel}>Entries{'\n'}This year</Text>
              </View>
              <MonthlyEntryBars counts={insights.monthlyEntryCounts} styles={styles} />
            </View>
          </LinearGradient>

          <View style={[styles.tilesRow, { marginTop: space[3] }]}>
            <LinearGradient
              colors={[...TILE_TOTAL_PAID_COLORS]}
              locations={[...TILE_TOTAL_PAID_LOCATIONS]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.metricTilePlain}
            >
              <Text style={styles.tileEyebrow}>Paid</Text>
              <Text style={styles.tileHero}>{totalPaidDisplay}</Text>
              <Text style={styles.tileFooter}>This year</Text>
            </LinearGradient>

            {colorScheme === 'dark' ? (
              <LinearGradient
                colors={[...TILE_PEOPLE_COLORS_DARK]}
                locations={[...TILE_PEOPLE_LOCATIONS]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.metricTileWithIcon}
              >
                <View style={styles.tileIconHeaderRow}>
                  <Text style={styles.tileEyebrow}>People</Text>
                  <View style={styles.tileIconBadgeOnGradient} accessibilityElementsHidden>
                    <Users size={15} color={ON_GRADIENT} strokeWidth={2.25} />
                  </View>
                </View>
                <Text style={[styles.tileHero, styles.tileHeroCentered]}>{insights.uniquePeople}</Text>
                <Text style={[styles.tileFooter, styles.tileFooterCentered]}>Connections</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.metricTileWithIcon, { backgroundColor: palette.fillSecondary }]}>
                <View style={styles.tileIconHeaderRow}>
                  <Text style={styles.peopleTileEyebrow}>People</Text>
                  <View style={styles.tileIconBadgeLight} accessibilityElementsHidden>
                    <Users size={15} color={palette.label} strokeWidth={2.25} />
                  </View>
                </View>
                <Text style={[styles.peopleTileHero, styles.tileHeroCentered]}>
                  {insights.uniquePeople}
                </Text>
                <Text style={[styles.peopleTileFooter, styles.tileFooterCentered]}>Connections</Text>
              </View>
            )}

            <LinearGradient
              colors={[...TILE_PAYMENTS_COLORS]}
              locations={[...TILE_PAYMENTS_LOCATIONS]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.metricTilePlain}
            >
              <Text style={styles.tileEyebrow}>Payments</Text>
              <Text style={styles.tileHero}>{insights.paymentsRecordedThisYear}</Text>
              <Text style={styles.tileFooter}>Recorded this year</Text>
            </LinearGradient>
          </View>
        </View>

        {groupInsights.totalGroups > 0 && (
          <View>
            <Text style={styles.sectionHeading}>Group Expenses</Text>
            <View style={styles.tilesRow}>
              <LinearGradient
                colors={[...TILE_GROUP_EXPENSES_COLORS]}
                locations={[...TILE_GROUP_EXPENSES_LOCATIONS]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.metricTileWithIcon}
              >
                <View style={styles.tileIconHeaderRow}>
                  <Text style={styles.tileEyebrow}>Spent</Text>
                  <View style={styles.tileIconBadgeOnGradient} accessibilityElementsHidden>
                    <Wallet size={15} color={ON_GRADIENT} strokeWidth={2.25} />
                  </View>
                </View>
                <Text style={[styles.tileHero, styles.tileHeroCentered]}>
                  {totalGroupSpentDisplay}
                </Text>
                <Text style={[styles.tileFooter, styles.tileFooterCentered]}>This year</Text>
              </LinearGradient>

              <View style={[styles.metricTilePlain, { backgroundColor: palette.fillSecondary }]}>
                <Text style={styles.peopleTileEyebrow}>Groups</Text>
                <Text style={styles.peopleTileHero}>{groupInsights.totalGroups}</Text>
                <Text style={styles.peopleTileFooter}>active</Text>
              </View>

              <LinearGradient
                colors={[...TILE_GROUP_SETTLED_COLORS]}
                locations={[...TILE_GROUP_SETTLED_LOCATIONS]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.metricTilePlain}
              >
                <Text style={styles.tileEyebrow}>Settled</Text>
                <Text style={styles.tileHero}>{totalGroupSettledDisplay}</Text>
                <Text style={styles.tileFooter}>This year</Text>
              </LinearGradient>
            </View>
          </View>
        )}
      </Animated.ScrollView>
      <StatusBarScrollFadeStrip />
      <View
        style={[styles.headerOverlay, { paddingTop: insets.top + space[3] }]}
        pointerEvents="box-none"
        collapsable={false}
      >
        <View style={styles.headerRow}>
          <HeaderIconButton
            icon={ChevronLeft}
            accessibilityLabel="Go back"
            onPress={onBack}
          />
          <Text style={styles.headerTitle}>Insights</Text>
        </View>
      </View>
    </View>
    </View>
  );
}
