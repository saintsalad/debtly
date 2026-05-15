import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TransactionFilterSheet, type TransactionFilterSheetHandle } from '@/features/debts/TransactionFilterSheet';
import { TransactionRow } from '@/features/debts/TransactionRow';
import {
  applyTransactionFilters,
  DEFAULT_TRANSACTION_FILTERS,
  hasActiveTransactionFilters,
  type TransactionFilters,
} from '@/features/debts/transactionFilters';
import { buildTransactionSections } from '@/features/debts/transactionSections';
import { Debt } from '@/features/debts/types';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { layout, radius, space, type, useCardShadow, useColors, type ColorPalette } from '@/lib/platform';
import { useTransactionDetail } from '@/lib/transactionDetailContext';
import { useStatusBarScrollFade } from '@/lib/statusBarScrollFade';
import { useDebtStore } from '@/stores/debtStore';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SearchField } from 'heroui-native';
import { MoreHorizontal, Receipt, Search, SearchX, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  InteractionManager,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Rect, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

/** Scroll-driven header hide/show: one curve + duration so title and chrome stay in lockstep. */
const TX_SCROLL_HEADER_SHOW_HIDE = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
} as const;

function createStyles(palette: ColorPalette, shadow: ReturnType<typeof useCardShadow>) {
  return StyleSheet.create({
    containerRoot: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    contentShell: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    containerInner: {
      flex: 1,
      paddingHorizontal: layout.screenPaddingX,
      backgroundColor: 'transparent',
    },
    titleBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space[3],
      paddingTop: space[4],
      paddingBottom: space[3],
      backgroundColor: 'transparent',
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: space[1],
      backgroundColor: 'transparent',
    },
    title: {
      ...type.title2,
      fontWeight: '600',
      color: palette.label,
    },
    subtitle: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    headerTrailing: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space[2],
      flexShrink: 0,
      backgroundColor: 'transparent',
    },
    chromeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      /** Bottom spacing lives inside the scroll-collapse clip (see `paddingBottom`). */
      paddingBottom: space[6],
      backgroundColor: 'transparent',
    },
    toolbarMain: {
      flex: 1,
      minWidth: 0,
      minHeight: 36,
      position: 'relative',
      backgroundColor: 'transparent',
    },
    toolbarLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      backgroundColor: 'transparent',
    },
    segmentIdleWrap: {
      width: '100%',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    toolbarIconWrap: {
      position: 'relative',
      width: 36,
      height: 36,
      flexShrink: 0,
    },
    toolbarIconBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: palette.tint,
      borderWidth: 2,
      borderColor: palette.bg,
      zIndex: 1,
    },
    searchField: {
      flex: 1,
      minWidth: 0,
      backgroundColor: 'transparent',
    },
    searchTrailing: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      gap: space[2],
      backgroundColor: 'transparent',
    },
    closeSlot: {
      width: 36,
      height: 36,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeTrackInner: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      width: space[2] + 36,
      backgroundColor: 'transparent',
    },
    txHeaderClip: {
      backgroundColor: 'transparent',
    },
    headerMeasureWrap: {
      backgroundColor: 'transparent',
    },
    /**
     * First ScrollView child — sticks so rows draw underneath on iOS.
     * `paddingTop: insets.top` matches Home: scroll `contentContainerStyle.paddingTop` + header’s own top padding.
     */
    stickyHeaderCluster: {
      backgroundColor: 'transparent',
    },
    list: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      backgroundColor: 'transparent',
    },
    listEmpty: {
      flexGrow: 1,
    },
    sectionBlock: {
      marginBottom: space[6],
    },
    sectionTitle: {
      ...type.subheadline,
      fontWeight: '600',
      color: palette.labelSecondary,
      marginBottom: space[2],
    },
    sectionCard: {
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadow,
    },
  });
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const colorScheme = useAppColorScheme();
  const palette = useColors();
  const shadow = useCardShadow();
  const styles = useMemo(() => createStyles(palette, shadow), [palette, shadow]);
  const closeTrackMax = space[2] + 36;
  const [search, setSearch] = useState('');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
  const filterSheetRef = useRef<TransactionFilterSheetHandle>(null);
  const searchInputRef = useRef<TextInput>(null);
  const suppressSearchBlurRef = useRef(false);
  const searchFocusedRef = useRef(false);
  const transactionHeaderNaturalHeight = useRef(0);
  const transactionChromeNaturalHeight = useRef(0);
  const hasMeasuredTxHeader = useRef(false);
  const hasMeasuredTxChrome = useRef(false);
  /** When true, skip writing `txHeaderHeight` from onLayout so iOS does not cancel the expand animation. */
  const txHeaderHeightExpandLockRef = useRef(false);
  const txHeaderHeight = useSharedValue(120);
  const txChromeHeight = useSharedValue(88);
  const naturalTitleBlockHeightSV = useSharedValue(120);
  const naturalChromeHeightSV = useSharedValue(88);
  const lastListScrollY = useSharedValue(-1);
  /** 1 = title + chrome (tabs / search toolbar) hidden by scroll. */
  const headerCollapsedByScroll = useSharedValue(0);
  /** Sums small upward dy while collapsed so slow scroll-up still reveals the header. */
  const scrollRevealAccum = useSharedValue(0);
  /** JS-side mirror for `onLayout` (avoid reading shared values on the RN JS thread). */
  const headerHiddenByScrollRef = useRef(false);
  /**
   * Set on the UI thread before scroll-driven `withTiming` so `onLayout` (JS) can skip writes that
   * would cancel the clip animation. Cleared when the timing finishes or the fallback timer fires.
   */
  const txScrollClipLayoutMuteSV = useSharedValue(0);
  const txScrollClipAnimFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTrackWidth = useSharedValue(0);
  const searchProgress = useSharedValue(0);
  const debts = useDebtStore((s) => s.debts);
  const { open: openTransactionDetail } = useTransactionDetail();
  const hasActiveFilters = hasActiveTransactionFilters(filters);

  const filtered = useMemo(() => {
    let list = debts;
    if (segmentIndex === 1) list = list.filter((d) => d.type === 'owed_to_me');
    if (segmentIndex === 2) list = list.filter((d) => d.type === 'i_owe');
    list = applyTransactionFilters(list, filters);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.personName.toLowerCase().includes(q) ||
          (d.note ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [debts, segmentIndex, search, filters]);

  const sections = useMemo(() => buildTransactionSections(filtered), [filtered]);

  const handleSelect = useCallback(
    (debt: Debt) => {
      openTransactionDetail(debt);
    },
    [openTransactionDetail]
  );

  const [searchFieldFocused, setSearchFieldFocused] = useState(false);

  const endTxScrollClipAnimation = useCallback(() => {
    txScrollClipLayoutMuteSV.value = 0;
    if (txScrollClipAnimFallbackTimerRef.current) {
      clearTimeout(txScrollClipAnimFallbackTimerRef.current);
      txScrollClipAnimFallbackTimerRef.current = null;
    }
  }, [txScrollClipLayoutMuteSV]);

  const beginTxScrollClipFallback = useCallback(() => {
    if (txScrollClipAnimFallbackTimerRef.current) {
      clearTimeout(txScrollClipAnimFallbackTimerRef.current);
    }
    txScrollClipAnimFallbackTimerRef.current = setTimeout(() => {
      txScrollClipAnimFallbackTimerRef.current = null;
      endTxScrollClipAnimation();
    }, TX_SCROLL_HEADER_SHOW_HIDE.duration + 80);
  }, [endTxScrollClipAnimation]);

  const prepareScrollHeaderExpand = useCallback(() => {
    headerHiddenByScrollRef.current = false;
    beginTxScrollClipFallback();
  }, [beginTxScrollClipFallback]);

  const prepareScrollHeaderCollapse = useCallback(() => {
    headerHiddenByScrollRef.current = true;
    beginTxScrollClipFallback();
  }, [beginTxScrollClipFallback]);

  const txHeaderAnimatedStyle = useAnimatedStyle(() => ({
    height: txHeaderHeight.value,
    overflow: 'hidden' as const,
  }));

  const txChromeAnimatedStyle = useAnimatedStyle(() => ({
    height: txChromeHeight.value,
    overflow: 'hidden' as const,
  }));

  const closeTrackAnimatedStyle = useAnimatedStyle(() => ({
    width: closeTrackWidth.value,
    overflow: 'hidden' as const,
    height: 36,
    position: 'relative' as const,
  }));

  const idleToolbarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchProgress.value, [0, 0.45, 1], [1, 0.25, 0]),
    transform: [{ translateX: interpolate(searchProgress.value, [0, 1], [0, -12]) }],
  }));

  const activeSearchToolbarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchProgress.value, [0, 0.55, 1], [0, 0.4, 1]),
    transform: [{ translateX: interpolate(searchProgress.value, [0, 1], [14, 0]) }],
  }));

  const { scrollY: statusBarScrollY } = useStatusBarScrollFade();

  const onTransactionHeaderLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0 || searchFocusedRef.current) return;
      if (h > 24) {
        const prev = transactionHeaderNaturalHeight.current;
        /** Ignore clipped intermediate heights while the clip animates open (keeps scroll hide/show targets stable). */
        const stable = prev > 24 ? Math.max(prev, h) : h;
        transactionHeaderNaturalHeight.current = stable;
        naturalTitleBlockHeightSV.value = stable;
        if (txScrollClipLayoutMuteSV.value === 1) {
          return;
        }
        if (!headerHiddenByScrollRef.current && !txHeaderHeightExpandLockRef.current) {
          if (!hasMeasuredTxHeader.current) {
            hasMeasuredTxHeader.current = true;
            txHeaderHeight.value = stable;
          }
        }
      }
    },
    [naturalTitleBlockHeightSV, txHeaderHeight, txScrollClipLayoutMuteSV]
  );

  const onChromeRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0 || searchFocusedRef.current) return;
      if (h > 16) {
        const prev = transactionChromeNaturalHeight.current;
        const stable = prev > 16 ? Math.max(prev, h) : h;
        transactionChromeNaturalHeight.current = stable;
        naturalChromeHeightSV.value = stable;
        if (txScrollClipLayoutMuteSV.value === 1) {
          return;
        }
        if (!headerHiddenByScrollRef.current) {
          if (!hasMeasuredTxChrome.current) {
            hasMeasuredTxChrome.current = true;
            txChromeHeight.value = stable;
          }
        }
      }
    },
    [naturalChromeHeightSV, txChromeHeight, txScrollClipLayoutMuteSV]
  );

  const endSearchChrome = useCallback(() => {
    searchFocusedRef.current = false;
    txHeaderHeightExpandLockRef.current = true;
    setSearchFieldFocused(false);
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        txHeaderHeightExpandLockRef.current = false;
      }, 280);
    });
  }, []);

  useEffect(() => {
    searchProgress.value = withTiming(searchFieldFocused ? 1 : 0, { duration: 220 });
  }, [searchFieldFocused, searchProgress]);

  useEffect(() => {
    if (searchFieldFocused) {
      closeTrackWidth.value = withTiming(closeTrackMax, { duration: 220 });
    } else {
      closeTrackWidth.value = withTiming(0, { duration: 220 });
    }
  }, [searchFieldFocused, closeTrackMax, closeTrackWidth]);

  useEffect(() => {
    if (searchFieldFocused) {
      txHeaderHeight.value = withTiming(0, { duration: 220 });
      return;
    }
    const natural = transactionHeaderNaturalHeight.current || 96;
    const naturalChrome = transactionChromeNaturalHeight.current || 88;
    if (headerHiddenByScrollRef.current) {
      txHeaderHeight.value = withTiming(0, { duration: 220 });
      txChromeHeight.value = withTiming(0, { duration: 220 });
    } else {
      txHeaderHeight.value = withTiming(natural, { duration: 220 });
      txChromeHeight.value = withTiming(naturalChrome, { duration: 220 });
    }
  }, [searchFieldFocused, txChromeHeight, txHeaderHeight]);

  const onListScroll = useAnimatedScrollHandler(
    {
      onBeginDrag: (e) => {
        lastListScrollY.value = e.contentOffset.y;
      },
      onScroll: (e) => {
        const y = e.contentOffset.y;
        statusBarScrollY.value = y;

        if (searchProgress.value > 0.12) {
          lastListScrollY.value = y;
          return;
        }

        if (lastListScrollY.value < 0) {
          lastListScrollY.value = y;
          return;
        }

        const prev = lastListScrollY.value;
        const dy = y - prev;
        lastListScrollY.value = y;

        const naturalTitle = naturalTitleBlockHeightSV.value;
        const naturalChrome = naturalChromeHeightSV.value;
        if (naturalTitle < 1) {
          return;
        }

        const collapsed = headerCollapsedByScroll.value === 1;

        if (y <= 24) {
          scrollRevealAccum.value = 0;
          if (collapsed) {
            headerCollapsedByScroll.value = 0;
            txScrollClipLayoutMuteSV.value = 1;
            runOnJS(prepareScrollHeaderExpand)();
            txHeaderHeight.value = withTiming(naturalTitle, TX_SCROLL_HEADER_SHOW_HIDE, (finished) => {
              if (finished) {
                runOnJS(endTxScrollClipAnimation)();
              }
            });
            txChromeHeight.value = withTiming(naturalChrome, TX_SCROLL_HEADER_SHOW_HIDE);
          }
          return;
        }

        if (collapsed) {
          if (dy < -0.5) {
            scrollRevealAccum.value += dy;
          } else if (dy > 4) {
            scrollRevealAccum.value = 0;
          }
          if (scrollRevealAccum.value <= -20 || dy < -12) {
            scrollRevealAccum.value = 0;
            headerCollapsedByScroll.value = 0;
            txScrollClipLayoutMuteSV.value = 1;
            runOnJS(prepareScrollHeaderExpand)();
            txHeaderHeight.value = withTiming(naturalTitle, TX_SCROLL_HEADER_SHOW_HIDE, (finished) => {
              if (finished) {
                runOnJS(endTxScrollClipAnimation)();
              }
            });
            txChromeHeight.value = withTiming(naturalChrome, TX_SCROLL_HEADER_SHOW_HIDE);
          }
          return;
        }

        scrollRevealAccum.value = 0;

        if (dy > 6 && y > 56 && headerCollapsedByScroll.value === 0) {
          txScrollClipLayoutMuteSV.value = 1;
          runOnJS(prepareScrollHeaderCollapse)();
          headerCollapsedByScroll.value = 1;
          txHeaderHeight.value = withTiming(0, TX_SCROLL_HEADER_SHOW_HIDE, (finished) => {
            if (finished) {
              runOnJS(endTxScrollClipAnimation)();
            }
          });
          txChromeHeight.value = withTiming(0, TX_SCROLL_HEADER_SHOW_HIDE);
        }
      },
    },
    [endTxScrollClipAnimation, prepareScrollHeaderCollapse, prepareScrollHeaderExpand]
  );

  useFocusEffect(
    useCallback(() => {
      void SystemUI.setBackgroundColorAsync('transparent');
      if (txScrollClipAnimFallbackTimerRef.current) {
        clearTimeout(txScrollClipAnimFallbackTimerRef.current);
        txScrollClipAnimFallbackTimerRef.current = null;
      }
      endTxScrollClipAnimation();
      lastListScrollY.value = -1;
      headerCollapsedByScroll.value = 0;
      scrollRevealAccum.value = 0;
      headerHiddenByScrollRef.current = false;
      const n = transactionHeaderNaturalHeight.current;
      const nc = transactionChromeNaturalHeight.current;
      if (n && n > 24) {
        txHeaderHeight.value = n;
      }
      if (nc && nc > 16) {
        txChromeHeight.value = nc;
      }
      return () => {
        if (txScrollClipAnimFallbackTimerRef.current) {
          clearTimeout(txScrollClipAnimFallbackTimerRef.current);
          txScrollClipAnimFallbackTimerRef.current = null;
        }
        endTxScrollClipAnimation();
        searchInputRef.current?.blur();
        suppressSearchBlurRef.current = false;
        searchFocusedRef.current = false;
        setSearchFieldFocused(false);
        const target = transactionHeaderNaturalHeight.current || 96;
        const targetChrome = transactionChromeNaturalHeight.current || 88;
        txHeaderHeight.value = target;
        txChromeHeight.value = targetChrome;
        naturalTitleBlockHeightSV.value = target;
        naturalChromeHeightSV.value = targetChrome;
        headerCollapsedByScroll.value = 0;
        headerHiddenByScrollRef.current = false;
        scrollRevealAccum.value = 0;
        lastListScrollY.value = -1;
        closeTrackWidth.value = 0;
        searchProgress.value = 0;
      };
    }, [
      closeTrackWidth,
      endTxScrollClipAnimation,
      headerCollapsedByScroll,
      lastListScrollY,
      naturalChromeHeightSV,
      naturalTitleBlockHeightSV,
      scrollRevealAccum,
      searchProgress,
      txChromeHeight,
      txHeaderHeight,
    ])
  );

  const handleSearchFocus = useCallback(() => {
    searchFocusedRef.current = true;
    setSearchFieldFocused(true);
  }, []);

  const openSearchFromIcon = useCallback(() => {
    searchFocusedRef.current = true;
    setSearchFieldFocused(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  const handleSearchBlur = useCallback(() => {
    if (suppressSearchBlurRef.current) return;
    endSearchChrome();
  }, [endSearchChrome]);

  const handleCloseSearchChrome = useCallback(() => {
    setSearch('');
    searchInputRef.current?.blur();
    requestAnimationFrame(() => {
      endSearchChrome();
    });
  }, [endSearchChrome]);

  const openFilters = useCallback(() => {
    filterSheetRef.current?.present();
    setTimeout(() => {
      suppressSearchBlurRef.current = false;
    }, 600);
  }, []);

  const openMoreMenu = useCallback(() => {
    Alert.alert('More', undefined, [
      {
        text: 'Filter',
        onPress: () => {
          openFilters();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [openFilters]);

  const emptySubtitle = useMemo(() => {
    if (search) return 'Try a different name or note.';
    if (hasActiveFilters) return 'Try changing or clearing your filters.';
    if (segmentIndex === 1) return 'Debts owed to you will appear here.';
    if (segmentIndex === 2) return 'Debts you owe will appear here.';
    return 'Your transactions will appear here.';
  }, [hasActiveFilters, search, segmentIndex]);

  const hasSearchQuery = search.trim().length > 0;

  const listScrollBottomPadding = layout.screenPaddingBottom;

  const segmentedTrackStyle = useMemo(
    () =>
      colorScheme === 'dark'
        ? {
            backgroundColor: 'rgba(28, 28, 30, 0.42)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: palette.opaqueSeparator,
          }
        : {
            backgroundColor: 'rgba(120, 120, 128, 0.14)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: palette.separator,
          },
    [colorScheme, palette.opaqueSeparator, palette.separator]
  );

  const bleedTop = insets.top;
  const bleedHeight = windowHeight + bleedTop;

  return (
    <AppScreen style={{ backgroundColor: 'transparent' }}>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        translucent
        backgroundColor="transparent"
      />
      <View style={styles.containerRoot}>
        {colorScheme === 'dark' ? (
          <Svg
            pointerEvents="none"
            width={windowWidth}
            height={bleedHeight}
            style={{ position: 'absolute', left: 0, right: 0, top: -bleedTop }}
          >
            <Defs>
              <SvgLinearGradient id="transactionsScreenBg" x1="0%" y1="0%" x2="92%" y2="100%">
                <Stop offset="0%" stopColor={palette.bg} />
                <Stop offset="42%" stopColor="#070F18" />
                <Stop offset="100%" stopColor="#0E1F38" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width={windowWidth} height={bleedHeight} fill="url(#transactionsScreenBg)" />
          </Svg>
        ) : (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { top: -bleedTop, backgroundColor: palette.bg },
            ]}
          />
        )}
        <View style={styles.contentShell}>
          <View style={styles.containerInner}>
          <Animated.ScrollView
            style={styles.list}
            stickyHeaderIndices={[0]}
            scrollEventThrottle={16}
            onScroll={onListScroll}
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: listScrollBottomPadding },
              filtered.length === 0 && styles.listEmpty,
            ]}
          >
            <View
              style={[styles.stickyHeaderCluster, { paddingTop: insets.top }]}
              pointerEvents="box-none"
              collapsable={false}
            >
              <Animated.View style={[txHeaderAnimatedStyle, styles.txHeaderClip]}>
                <View onLayout={onTransactionHeaderLayout} style={styles.headerMeasureWrap}>
                  <View style={styles.titleBlock}>
                    <View style={styles.headerCopy}>
                      <Text style={styles.title}>Transactions</Text>
                      <Text style={styles.subtitle}>{filtered.length} records</Text>
                    </View>
                    <View style={styles.headerTrailing}>
                      <View style={styles.toolbarIconWrap}>
                        <HeaderIconButton
                          icon={Search}
                          accessibilityLabel={
                            hasSearchQuery
                              ? 'Search transactions, text filter is active'
                              : 'Search transactions'
                          }
                          onPress={openSearchFromIcon}
                          variant="secondary"
                          iconSize={20}
                        />
                        {hasSearchQuery ? (
                          <View
                            style={styles.toolbarIconBadge}
                            pointerEvents="none"
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                          />
                        ) : null}
                      </View>
                      <HeaderIconButton
                        icon={MoreHorizontal}
                        accessibilityLabel="More options"
                        onPress={openMoreMenu}
                        variant="secondary"
                        iconSize={20}
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={txChromeAnimatedStyle}>
                <View
                  onLayout={onChromeRowLayout}
                  style={[
                    styles.chromeRow,
                    Platform.OS === 'android' && { paddingTop: space[2] },
                  ]}
                >
                  <View style={styles.toolbarMain}>
                    <Animated.View
                      style={[styles.toolbarLayer, idleToolbarStyle]}
                      pointerEvents={searchFieldFocused ? 'none' : 'auto'}
                      importantForAccessibility={searchFieldFocused ? 'no-hide-descendants' : 'auto'}
                    >
                      <View style={styles.segmentIdleWrap}>
                        <SegmentedControl
                          variant="default"
                          trackStyle={segmentedTrackStyle}
                          options={['All', 'Owed you', 'You owe']}
                          selectedIndex={segmentIndex}
                          onChange={setSegmentIndex}
                        />
                      </View>
                    </Animated.View>
                    <Animated.View
                      style={[styles.toolbarLayer, activeSearchToolbarStyle]}
                      pointerEvents={searchFieldFocused ? 'auto' : 'none'}
                      importantForAccessibility={searchFieldFocused ? 'auto' : 'no-hide-descendants'}
                    >
                      <View style={styles.searchField}>
                        <SearchField value={search} onChange={setSearch}>
                          <SearchField.Group>
                            <SearchField.SearchIcon />
                            <SearchField.Input
                              ref={searchInputRef}
                              placeholder="Search by name or note"
                              className="rounded-full h-9 py-0 bg-transparent"
                              onFocus={handleSearchFocus}
                              onBlur={handleSearchBlur}
                            />
                            <SearchField.ClearButton />
                          </SearchField.Group>
                        </SearchField>
                      </View>
                      <View style={styles.searchTrailing}>
                        <Animated.View style={closeTrackAnimatedStyle}>
                          <View
                            style={styles.closeTrackInner}
                            pointerEvents={searchFieldFocused ? 'auto' : 'none'}
                            importantForAccessibility={searchFieldFocused ? 'auto' : 'no-hide-descendants'}
                          >
                            <View style={{ width: space[2] }} />
                            <View style={styles.closeSlot}>
                              <HeaderIconButton
                                icon={X}
                                accessibilityLabel="Close search"
                                onPress={handleCloseSearchChrome}
                                variant="secondary"
                                iconSize={20}
                              />
                            </View>
                          </View>
                        </Animated.View>
                      </View>
                    </Animated.View>
                  </View>
                </View>
              </Animated.View>
            </View>

            {filtered.length === 0 ? (
              <EmptyState
                title={search || hasActiveFilters ? 'No results' : 'No transactions'}
                subtitle={emptySubtitle}
                icon={
                  search || hasActiveFilters ? (
                    <SearchX size={40} color={palette.labelTertiary} />
                  ) : (
                    <Receipt size={40} color={palette.labelTertiary} />
                  )
                }
              />
            ) : (
              sections.map((section) => (
                <View key={section.key} style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.sectionCard}>
                    {section.data.map((debt, index) => (
                      <TransactionRow
                        key={debt.id}
                        debt={debt}
                        onPress={() => handleSelect(debt)}
                        showSeparator={index < section.data.length - 1}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
          </Animated.ScrollView>

          <TransactionFilterSheet
            ref={filterSheetRef}
            filters={filters}
            onChange={setFilters}
          />
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
