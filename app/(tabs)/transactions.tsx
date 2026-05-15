import { AppScreen } from '@/components/ui/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { ContextMenuDropdown, type ContextMenuSection } from '@/components/ui/ContextMenuDropdown';
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
import { glassBorderStyle, glassBorderWidth } from '@/lib/glassBorder';
import { layout, space, type, useColors, type ColorPalette } from '@/lib/platform';
import { useGlassSeparatorColor } from '@/lib/glassSurface';
import {
  screenHeaderLayerStyle,
  scrollContentLayerStyle,
  StatusBarScrollFadeStrip,
  useStatusBarScrollFade,
} from '@/lib/statusBarScrollFade';
import { useTransactionDetail } from '@/lib/transactionDetailContext';
import { useDebtStore } from '@/stores/debtStore';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SearchField } from 'heroui-native';
import {
  ArrowDownUp,
  MoreHorizontal,
  Receipt,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  StickyNote,
  User,
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

/** Scroll-driven header hide/show: one curve + duration so title and chrome stay in lockstep. */
const TX_SCROLL_HEADER_SHOW_HIDE = {
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
    screenLayerStack: {
      flex: 1,
      position: 'relative',
      backgroundColor: 'transparent',
    },
    scrollTopSpacer: {
      backgroundColor: 'transparent',
    },
    /** Fixed above scroll content and the status-bar fade strip. */
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
    /** iOS Journal search — flat list, no grouped card. */
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

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useAppColorScheme();
  const palette = useColors();
  const glassSeparator = useGlassSeparatorColor();
  const styles = useMemo(() => createStyles(palette, glassSeparator), [palette, glassSeparator]);
  const closeTrackMax = space[2] + 36;
  const [search, setSearch] = useState('');
  const [searchFieldFocused, setSearchFieldFocused] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [txSort, setTxSort] = useState<'entry_desc' | 'entry_asc' | 'name_asc'>('entry_desc');
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
  const filterSheetRef = useRef<TransactionFilterSheetHandle>(null);
  const moreAnchorRef = useRef<React.ComponentRef<typeof View>>(null);
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
  const hasNonDefaultSort = txSort !== 'entry_desc';
  const moreMenuShowsBadge = hasActiveFilters || hasNonDefaultSort;

  const moreOptionsA11yLabel = useMemo(() => {
    if (hasActiveFilters && hasNonDefaultSort) {
      return 'More options, filters and sort are active';
    }
    if (hasActiveFilters) return 'More options, filters are active';
    if (hasNonDefaultSort) return 'More options, custom sort is active';
    return 'More options';
  }, [hasActiveFilters, hasNonDefaultSort]);

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
    return [...list].sort((a, b) => {
      if (txSort === 'entry_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (txSort === 'entry_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return a.personName.localeCompare(b.personName, undefined, { sensitivity: 'base' });
    });
  }, [debts, segmentIndex, search, filters, txSort]);

  const sections = useMemo(() => buildTransactionSections(filtered), [filtered]);

  const showSearchSuggestions = searchFieldFocused && !search.trim();

  const handleSelect = useCallback(
    (debt: Debt) => {
      openTransactionDetail(debt);
    },
    [openTransactionDetail]
  );

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

  const { scrollY: statusBarScrollY } = useStatusBarScrollFade({ overlayHost: 'screen' });

  const scrollTopSpacerStyle = useAnimatedStyle(() => ({
    height: insets.top + txHeaderHeight.value + txChromeHeight.value,
  }));

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
    endSearchChrome();
    searchInputRef.current?.blur();
    setSearch('');
  }, [endSearchChrome]);

  const openFilters = useCallback(() => {
    filterSheetRef.current?.present();
    setTimeout(() => {
      suppressSearchBlurRef.current = false;
    }, 600);
  }, []);

  const openMoreMenu = useCallback(() => {
    setMoreMenuOpen(true);
  }, []);

  const closeMoreMenu = useCallback(() => {
    setMoreMenuOpen(false);
  }, []);

  const resetTransactionsView = useCallback(() => {
    setFilters(DEFAULT_TRANSACTION_FILTERS);
    setTxSort('entry_desc');
    setSearch('');
    setSegmentIndex(0);
  }, []);

  const moreMenuSections = useMemo((): ContextMenuSection[] => {
    const sortSubtitle =
      txSort === 'entry_desc'
        ? 'Newest first'
        : txSort === 'entry_asc'
          ? 'Oldest first'
          : 'Name (A–Z)';
    return [
      {
        items: [
          {
            id: 'sort',
            title: 'Sort by',
            subtitle: sortSubtitle,
            icon: ArrowDownUp,
            submenu: [
              {
                id: 'entry_desc',
                title: 'Entry date',
                subtitle: 'Newest first',
                onPress: () => setTxSort('entry_desc'),
              },
              {
                id: 'entry_asc',
                title: 'Entry date',
                subtitle: 'Oldest first',
                onPress: () => setTxSort('entry_asc'),
              },
              {
                id: 'name_asc',
                title: 'Name',
                subtitle: 'A to Z',
                onPress: () => setTxSort('name_asc'),
              },
            ],
          },
          {
            id: 'filter',
            title: 'Filter',
            icon: SlidersHorizontal,
            onPress: openFilters,
          },
        ],
      },
      {
        items: [
          {
            id: 'reset',
            title: 'Reset',
            icon: RotateCcw,
            onPress: resetTransactionsView,
          },
        ],
      },
    ];
  }, [txSort, openFilters, resetTransactionsView]);

  const emptySubtitle = useMemo(() => {
    if (search) return 'Try a different name or note.';
    if (hasActiveFilters) return 'Try changing or clearing your filters.';
    if (segmentIndex === 1) return 'Debts owed to you will appear here.';
    if (segmentIndex === 2) return 'Debts you owe will appear here.';
    return 'Your transactions will appear here.';
  }, [hasActiveFilters, search, segmentIndex]);

  const hasSearchQuery = search.trim().length > 0;

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
                        <User size={SUGGESTED_ICON_SIZE} color={palette.labelSecondary} />
                      </View>
                      <Text style={styles.suggestionLabel}>Name</Text>
                    </View>
                    <View style={styles.suggestionDivider} />
                    <View style={styles.suggestionRow}>
                      <View style={styles.suggestionIconTrack}>
                        <StickyNote size={SUGGESTED_ICON_SIZE} color={palette.labelSecondary} />
                      </View>
                      <Text style={styles.suggestionLabel}>Note</Text>
                    </View>
                  </View>
                ) : filtered.length === 0 ? (
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
                      <GlassCard style={styles.sectionCard}>
                        {section.data.map((debt, index) => (
                          <TransactionRow
                            key={debt.id}
                            debt={debt}
                            onPress={() => handleSelect(debt)}
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
                        <View ref={moreAnchorRef} collapsable={false} style={styles.toolbarIconWrap}>
                          <HeaderIconButton
                            icon={MoreHorizontal}
                            accessibilityLabel={moreOptionsA11yLabel}
                            onPress={openMoreMenu}
                            variant="secondary"
                            iconSize={20}
                          />
                          {moreMenuShowsBadge ? (
                            <View
                              style={styles.toolbarIconBadge}
                              pointerEvents="none"
                              accessibilityElementsHidden
                              importantForAccessibility="no-hide-descendants"
                            />
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                <Animated.View style={txChromeAnimatedStyle}>
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
            </View>

            <TransactionFilterSheet
              ref={filterSheetRef}
              filters={filters}
              onChange={setFilters}
            />
            <ContextMenuDropdown
              visible={moreMenuOpen}
              onClose={closeMoreMenu}
              anchorRef={moreAnchorRef}
              sections={moreMenuSections}
            />
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
