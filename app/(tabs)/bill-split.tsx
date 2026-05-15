import { AppScreen } from '@/components/ui/AppScreen';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AddBillSplitSheet, type AddBillSplitSheetHandle } from '@/features/bill-split/AddBillSplitSheet';
import { BillSplitCard } from '@/features/bill-split/BillSplitCard';
import {
  buildBillSplitSections,
  isBillSplitSettled,
} from '@/features/bill-split/billSplitSections';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { glassBorderStyle, glassBorderWidth } from '@/lib/glassBorder';
import { layout, space, type, useColors, type ColorPalette } from '@/lib/platform';
import { useGlassSeparatorColor } from '@/lib/glassSurface';
import {
  screenHeaderLayerStyle,
  scrollContentLayerStyle,
  StatusBarScrollFadeStrip,
  useStatusBarScrollFade,
} from '@/lib/statusBarScrollFade';
import { useBillSplitStore } from '@/stores/billSplitStore';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SearchField } from 'heroui-native';
import {
  Receipt,
  Search,
  SearchX,
  User,
  Users,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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

/** Scroll-driven header hide/show — same curve as Transactions for consistent chrome motion. */
const BS_SCROLL_HEADER_SHOW_HIDE = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
} as const;

/** iOS Journal–style suggested row: fixed icon column + full-width divider. */
const SUGGESTED_ICON_SIZE = 18;
const SUGGESTED_ICON_TRACK = 24;

function createStyles(palette: ColorPalette, glassSeparator: string) {
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
    chromeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
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
      backgroundColor: 'transparent',
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
    bsHeaderClip: {
      backgroundColor: 'transparent',
    },
    headerMeasureWrap: {
      backgroundColor: 'transparent',
    },
    screenLayerStack: {
      flex: 1,
      position: 'relative',
      backgroundColor: 'transparent',
    },
    scrollTopSpacer: {
      backgroundColor: 'transparent',
    },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
      ...screenHeaderLayerStyle,
    },
    list: {
      flex: 1,
      backgroundColor: 'transparent',
      ...scrollContentLayerStyle,
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
    sectionCard: {},
    suggestedSection: {
      marginBottom: space[6],
      backgroundColor: 'transparent',
    },
    suggestedHeader: {
      ...type.title1,
      color: palette.label,
      letterSpacing: type.title1.letterSpacing,
      marginBottom: space[3],
      paddingTop: space[1],
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[3] + 1,
      minHeight: 48,
      backgroundColor: 'transparent',
    },
    suggestionIconTrack: {
      width: SUGGESTED_ICON_TRACK,
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestionLabel: {
      ...type.body,
      fontWeight: '400',
      color: palette.label,
      flex: 1,
    },
    suggestionDivider: {
      height: StyleSheet.hairlineWidth,
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: glassSeparator,
    },
  });
}

export default function BillSplitScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useAppColorScheme();
  const palette = useColors();
  const glassSeparator = useGlassSeparatorColor();
  const styles = useMemo(() => createStyles(palette, glassSeparator), [palette, glassSeparator]);
  const closeTrackMax = space[2] + 36;
  const splits = useBillSplitStore((s) => s.splits);
  const sheetRef = useRef<AddBillSplitSheetHandle>(null);
  const searchInputRef = useRef<TextInput>(null);
  const searchFocusedRef = useRef(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [searchFieldFocused, setSearchFieldFocused] = useState(false);

  const billSplitHeaderNaturalHeight = useRef(0);
  const billSplitChromeNaturalHeight = useRef(0);
  const hasMeasuredBsHeader = useRef(false);
  const hasMeasuredBsChrome = useRef(false);
  const bsHeaderHeightExpandLockRef = useRef(false);
  const bsHeaderHeight = useSharedValue(120);
  const bsChromeHeight = useSharedValue(52);
  const naturalTitleBlockHeightSV = useSharedValue(120);
  const naturalChromeHeightSV = useSharedValue(52);
  const lastListScrollY = useSharedValue(-1);
  const headerCollapsedByScroll = useSharedValue(0);
  const scrollRevealAccum = useSharedValue(0);
  const headerHiddenByScrollRef = useRef(false);
  const bsScrollClipLayoutMuteSV = useSharedValue(0);
  const bsScrollClipAnimFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTrackWidth = useSharedValue(0);
  const searchProgress = useSharedValue(0);

  const filtered = useMemo(() => {
    let list = [...splits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (segmentIndex === 0) {
      list = list.filter((split) => !isBillSplitSettled(split));
    } else {
      list = list.filter((split) => isBillSplitSettled(split));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (split) =>
          split.title.toLowerCase().includes(q) ||
          split.participants.some((p) => p.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [splits, segmentIndex, search]);

  const sections = useMemo(() => buildBillSplitSections(filtered), [filtered]);
  const showSearchSuggestions = searchFieldFocused && !search.trim();
  const hasSearchQuery = search.trim().length > 0;

  const endBsScrollClipAnimation = useCallback(() => {
    bsScrollClipLayoutMuteSV.value = 0;
    if (bsScrollClipAnimFallbackTimerRef.current) {
      clearTimeout(bsScrollClipAnimFallbackTimerRef.current);
      bsScrollClipAnimFallbackTimerRef.current = null;
    }
  }, [bsScrollClipLayoutMuteSV]);

  const beginBsScrollClipFallback = useCallback(() => {
    if (bsScrollClipAnimFallbackTimerRef.current) {
      clearTimeout(bsScrollClipAnimFallbackTimerRef.current);
    }
    bsScrollClipAnimFallbackTimerRef.current = setTimeout(() => {
      bsScrollClipAnimFallbackTimerRef.current = null;
      endBsScrollClipAnimation();
    }, BS_SCROLL_HEADER_SHOW_HIDE.duration + 80);
  }, [endBsScrollClipAnimation]);

  const prepareScrollHeaderExpand = useCallback(() => {
    headerHiddenByScrollRef.current = false;
    beginBsScrollClipFallback();
  }, [beginBsScrollClipFallback]);

  const prepareScrollHeaderCollapse = useCallback(() => {
    headerHiddenByScrollRef.current = true;
    beginBsScrollClipFallback();
  }, [beginBsScrollClipFallback]);

  const bsHeaderAnimatedStyle = useAnimatedStyle(() => ({
    height: bsHeaderHeight.value,
    overflow: 'hidden' as const,
  }));

  const bsChromeAnimatedStyle = useAnimatedStyle(() => ({
    height: bsChromeHeight.value,
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

  const { scrollY: statusBarScrollY } = useStatusBarScrollFade({ overlayHost: 'screen' });

  const scrollTopSpacerStyle = useAnimatedStyle(() => ({
    height: insets.top + bsHeaderHeight.value + bsChromeHeight.value,
  }));

  const onBillSplitHeaderLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0 || searchFocusedRef.current) return;
      if (h > 24) {
        const prev = billSplitHeaderNaturalHeight.current;
        const stable = prev > 24 ? Math.max(prev, h) : h;
        billSplitHeaderNaturalHeight.current = stable;
        naturalTitleBlockHeightSV.value = stable;
        if (bsScrollClipLayoutMuteSV.value === 1) return;
        if (!headerHiddenByScrollRef.current && !bsHeaderHeightExpandLockRef.current) {
          if (!hasMeasuredBsHeader.current) {
            hasMeasuredBsHeader.current = true;
            bsHeaderHeight.value = stable;
          }
        }
      }
    },
    [bsHeaderHeight, bsScrollClipLayoutMuteSV, naturalTitleBlockHeightSV]
  );

  const onChromeRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0 || searchFocusedRef.current) return;
      if (h > 16) {
        const prev = billSplitChromeNaturalHeight.current;
        const stable = prev > 16 ? Math.max(prev, h) : h;
        billSplitChromeNaturalHeight.current = stable;
        naturalChromeHeightSV.value = stable;
        if (bsScrollClipLayoutMuteSV.value === 1) return;
        if (!headerHiddenByScrollRef.current) {
          if (!hasMeasuredBsChrome.current) {
            hasMeasuredBsChrome.current = true;
            bsChromeHeight.value = stable;
          }
        }
      }
    },
    [bsChromeHeight, bsScrollClipLayoutMuteSV, naturalChromeHeightSV]
  );

  const endSearchChrome = useCallback(() => {
    searchFocusedRef.current = false;
    bsHeaderHeightExpandLockRef.current = true;
    setSearchFieldFocused(false);
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        bsHeaderHeightExpandLockRef.current = false;
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
      bsHeaderHeight.value = withTiming(0, { duration: 220 });
      return;
    }
    const natural = billSplitHeaderNaturalHeight.current || 96;
    const naturalChrome = billSplitChromeNaturalHeight.current || 52;
    if (headerHiddenByScrollRef.current) {
      bsHeaderHeight.value = withTiming(0, { duration: 220 });
      bsChromeHeight.value = withTiming(0, { duration: 220 });
    } else {
      bsHeaderHeight.value = withTiming(natural, { duration: 220 });
      bsChromeHeight.value = withTiming(naturalChrome, { duration: 220 });
    }
  }, [searchFieldFocused, bsChromeHeight, bsHeaderHeight]);

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
        if (naturalTitle < 1) return;

        const collapsed = headerCollapsedByScroll.value === 1;

        if (y <= 24) {
          scrollRevealAccum.value = 0;
          if (collapsed) {
            headerCollapsedByScroll.value = 0;
            bsScrollClipLayoutMuteSV.value = 1;
            runOnJS(prepareScrollHeaderExpand)();
            bsHeaderHeight.value = withTiming(naturalTitle, BS_SCROLL_HEADER_SHOW_HIDE, (finished) => {
              if (finished) runOnJS(endBsScrollClipAnimation)();
            });
            bsChromeHeight.value = withTiming(naturalChrome, BS_SCROLL_HEADER_SHOW_HIDE);
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
            bsScrollClipLayoutMuteSV.value = 1;
            runOnJS(prepareScrollHeaderExpand)();
            bsHeaderHeight.value = withTiming(naturalTitle, BS_SCROLL_HEADER_SHOW_HIDE, (finished) => {
              if (finished) runOnJS(endBsScrollClipAnimation)();
            });
            bsChromeHeight.value = withTiming(naturalChrome, BS_SCROLL_HEADER_SHOW_HIDE);
          }
          return;
        }

        scrollRevealAccum.value = 0;

        if (dy > 6 && y > 56 && headerCollapsedByScroll.value === 0) {
          bsScrollClipLayoutMuteSV.value = 1;
          runOnJS(prepareScrollHeaderCollapse)();
          headerCollapsedByScroll.value = 1;
          bsHeaderHeight.value = withTiming(0, BS_SCROLL_HEADER_SHOW_HIDE, (finished) => {
            if (finished) runOnJS(endBsScrollClipAnimation)();
          });
          bsChromeHeight.value = withTiming(0, BS_SCROLL_HEADER_SHOW_HIDE);
        }
      },
    },
    [endBsScrollClipAnimation, prepareScrollHeaderCollapse, prepareScrollHeaderExpand]
  );

  useFocusEffect(
    useCallback(() => {
      void SystemUI.setBackgroundColorAsync('transparent');
      if (bsScrollClipAnimFallbackTimerRef.current) {
        clearTimeout(bsScrollClipAnimFallbackTimerRef.current);
        bsScrollClipAnimFallbackTimerRef.current = null;
      }
      endBsScrollClipAnimation();
      lastListScrollY.value = -1;
      headerCollapsedByScroll.value = 0;
      scrollRevealAccum.value = 0;
      headerHiddenByScrollRef.current = false;
      const n = billSplitHeaderNaturalHeight.current;
      const nc = billSplitChromeNaturalHeight.current;
      if (n && n > 24) bsHeaderHeight.value = n;
      if (nc && nc > 16) bsChromeHeight.value = nc;
      return () => {
        if (bsScrollClipAnimFallbackTimerRef.current) {
          clearTimeout(bsScrollClipAnimFallbackTimerRef.current);
          bsScrollClipAnimFallbackTimerRef.current = null;
        }
        endBsScrollClipAnimation();
        searchInputRef.current?.blur();
        searchFocusedRef.current = false;
        setSearchFieldFocused(false);
        const target = billSplitHeaderNaturalHeight.current || 96;
        const targetChrome = billSplitChromeNaturalHeight.current || 52;
        bsHeaderHeight.value = target;
        bsChromeHeight.value = targetChrome;
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
      bsChromeHeight,
      bsHeaderHeight,
      closeTrackWidth,
      endBsScrollClipAnimation,
      headerCollapsedByScroll,
      lastListScrollY,
      naturalChromeHeightSV,
      naturalTitleBlockHeightSV,
      scrollRevealAccum,
      searchProgress,
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
    endSearchChrome();
  }, [endSearchChrome]);

  const handleCloseSearchChrome = useCallback(() => {
    endSearchChrome();
    searchInputRef.current?.blur();
    setSearch('');
  }, [endSearchChrome]);

  const emptySubtitle = useMemo(() => {
    if (search) return 'Try a different title or participant name.';
    if (segmentIndex === 0) {
      return splits.length === 0
        ? 'Create a split to divide a bill with friends.'
        : 'Splits with outstanding balances appear here.';
    }
    return 'Fully settled splits appear here.';
  }, [segmentIndex, search, splits.length]);

  const emptyTitle = useMemo(() => {
    if (search) return 'No results';
    if (splits.length === 0) return 'No splits yet';
    return segmentIndex === 0 ? 'No active splits' : 'No settled splits';
  }, [segmentIndex, search, splits.length]);

  const listScrollBottomPadding = Platform.OS === 'ios' ? layout.screenPaddingBottom : 0;
  const listContentShouldGrow = !showSearchSuggestions && filtered.length === 0;

  const segmentedTrackStyle = useMemo(
    () => ({
      backgroundColor:
        colorScheme === 'dark' ? 'rgba(28, 28, 30, 0.42)' : 'rgba(120, 120, 128, 0.14)',
      ...glassBorderStyle(colorScheme, 'surface'),
    }),
    [colorScheme]
  );

  return (
    <AppScreen reserveTabBarInset={false}>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        translucent
        backgroundColor="transparent"
      />
      <View style={styles.containerRoot}>
        <View style={styles.contentShell}>
          <View style={styles.containerInner}>
            <View style={styles.screenLayerStack} collapsable={false}>
              <Animated.ScrollView
                style={styles.list}
                scrollEventThrottle={16}
                onScroll={onListScroll}
                keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: listScrollBottomPadding },
                  listContentShouldGrow && styles.listEmpty,
                ]}
              >
                <Animated.View style={[styles.scrollTopSpacer, scrollTopSpacerStyle]} />
                {showSearchSuggestions ? (
                  <View style={styles.suggestedSection}>
                    <Text style={styles.suggestedHeader} accessibilityRole="header">
                      Suggested
                    </Text>
                    <View style={styles.suggestionRow}>
                      <View style={styles.suggestionIconTrack}>
                        <Receipt size={SUGGESTED_ICON_SIZE} color={palette.labelSecondary} />
                      </View>
                      <Text style={styles.suggestionLabel}>Title</Text>
                    </View>
                    <View style={styles.suggestionDivider} />
                    <View style={styles.suggestionRow}>
                      <View style={styles.suggestionIconTrack}>
                        <User size={SUGGESTED_ICON_SIZE} color={palette.labelSecondary} />
                      </View>
                      <Text style={styles.suggestionLabel}>Participant</Text>
                    </View>
                  </View>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    title={emptyTitle}
                    subtitle={emptySubtitle}
                    icon={
                      search ? (
                        <SearchX size={40} color={palette.labelTertiary} />
                      ) : (
                        <Users size={40} color={palette.labelTertiary} />
                      )
                    }
                  />
                ) : (
                  sections.map((section) => (
                    <View key={section.key} style={styles.sectionBlock}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      <GlassCard style={styles.sectionCard}>
                        {section.data.map((split, index) => (
                          <BillSplitCard
                            key={split.id}
                            split={split}
                            showSeparator={index < section.data.length - 1}
                            dividerVariant="glass"
                          />
                        ))}
                      </GlassCard>
                    </View>
                  ))
                )}
              </Animated.ScrollView>

              <StatusBarScrollFadeStrip />

              <View
                style={[styles.headerOverlay, { paddingTop: insets.top }]}
                pointerEvents="box-none"
                collapsable={false}
              >
                <Animated.View style={[bsHeaderAnimatedStyle, styles.bsHeaderClip]}>
                  <View onLayout={onBillSplitHeaderLayout} style={styles.headerMeasureWrap}>
                    <View style={styles.titleBlock}>
                      <View style={styles.headerCopy}>
                        <Text style={styles.title}>Bill split</Text>
                        <Text style={styles.subtitle}>
                          {filtered.length} {filtered.length === 1 ? 'split' : 'splits'}
                        </Text>
                      </View>
                      <View style={styles.headerTrailing}>
                        <View style={styles.toolbarIconWrap}>
                          <HeaderIconButton
                            icon={Search}
                            accessibilityLabel={
                              hasSearchQuery
                                ? 'Search bill splits, text filter is active'
                                : 'Search bill splits'
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
                        <GlassButton
                          size="sm"
                          variant="primary"
                          onPress={() => sheetRef.current?.present()}
                        >
                          <GlassButton.Label>New split</GlassButton.Label>
                        </GlassButton>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                <Animated.View style={bsChromeAnimatedStyle}>
                  <View
                    onLayout={onChromeRowLayout}
                    style={[
                      styles.chromeRow,
                      Platform.OS === 'ios' && { paddingTop: glassBorderWidth },
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
                            variant="inline"
                            trackStyle={segmentedTrackStyle}
                            options={['Active', 'Settled']}
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
                                placeholder="Search by title or participant"
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
            </View>

            <AddBillSplitSheet ref={sheetRef} />
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
