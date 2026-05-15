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
import { useDebtStore } from '@/stores/debtStore';
import { useFocusEffect } from '@react-navigation/native';
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
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Rect, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

function createStyles(palette: ColorPalette, shadow: ReturnType<typeof useCardShadow>) {
  return StyleSheet.create({
    containerRoot: {
      flex: 1,
    },
    containerInner: {
      flex: 1,
      paddingHorizontal: layout.screenPaddingX,
    },
    titleBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space[3],
      paddingTop: space[4],
      paddingBottom: space[3],
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: space[1],
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
    },
    chromeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      marginBottom: space[6],
    },
    toolbarMain: {
      flex: 1,
      minWidth: 0,
      minHeight: 36,
      position: 'relative',
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
    },
    segmentIdleWrap: {
      width: '100%',
      alignItems: 'center',
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
    },
    searchTrailing: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      gap: space[2],
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
    },
    list: {
      flex: 1,
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
  const compactContentTop = useMemo(() => insets.top + space[2], [insets.top]);
  const scrollIdleTop = useMemo(() => insets.top, [insets.top]);
  const closeTrackMax = space[2] + 36;
  const [search, setSearch] = useState('');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
  const filterSheetRef = useRef<TransactionFilterSheetHandle>(null);
  const searchInputRef = useRef<TextInput>(null);
  const suppressSearchBlurRef = useRef(false);
  const searchFocusedRef = useRef(false);
  const transactionHeaderNaturalHeight = useRef(0);
  const hasMeasuredTxHeader = useRef(false);
  /** When true, skip writing `txHeaderHeight` from onLayout so iOS does not cancel the expand animation. */
  const txHeaderHeightExpandLockRef = useRef(false);
  const txHeaderHeight = useSharedValue(120);
  const compactTopSV = useSharedValue(compactContentTop);
  const scrollIdleTopSV = useSharedValue(scrollIdleTop);
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

  const txHeaderAnimatedStyle = useAnimatedStyle(() => ({
    height: txHeaderHeight.value,
    overflow: 'hidden' as const,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const paddingTop = interpolate(
      searchProgress.value,
      [0, 1],
      [scrollIdleTopSV.value, compactTopSV.value]
    );
    return { paddingTop };
  });

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

  const onTransactionHeaderLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0 || searchFocusedRef.current) return;
      transactionHeaderNaturalHeight.current = h;
      if (!hasMeasuredTxHeader.current) {
        hasMeasuredTxHeader.current = true;
      }
      if (!txHeaderHeightExpandLockRef.current) {
        txHeaderHeight.value = h;
      }
    },
    [txHeaderHeight]
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
    compactTopSV.value = compactContentTop;
  }, [compactContentTop, compactTopSV]);

  useEffect(() => {
    scrollIdleTopSV.value = scrollIdleTop;
  }, [scrollIdleTop, scrollIdleTopSV]);

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
    const target = transactionHeaderNaturalHeight.current || 96;
    txHeaderHeight.value = withTiming(target, { duration: 220 });
  }, [searchFieldFocused, txHeaderHeight]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        searchInputRef.current?.blur();
        suppressSearchBlurRef.current = false;
        searchFocusedRef.current = false;
        setSearchFieldFocused(false);
        const target = transactionHeaderNaturalHeight.current || 96;
        txHeaderHeight.value = target;
        closeTrackWidth.value = 0;
        searchProgress.value = 0;
      };
    }, [closeTrackWidth, searchProgress, txHeaderHeight])
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

  return (
    <AppScreen>
      <Animated.View style={[styles.containerRoot, containerAnimatedStyle]}>
        {colorScheme === 'dark' ? (
          <Svg
            pointerEvents="none"
            width={windowWidth}
            height={windowHeight}
            style={StyleSheet.absoluteFillObject}
          >
            <Defs>
              <SvgLinearGradient id="transactionsScreenBg" x1="0%" y1="0%" x2="92%" y2="100%">
                <Stop offset="0%" stopColor={palette.bg} />
                <Stop offset="42%" stopColor="#070F18" />
                <Stop offset="100%" stopColor="#0E1F38" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width={windowWidth} height={windowHeight} fill="url(#transactionsScreenBg)" />
          </Svg>
        ) : (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: palette.bg }]}
          />
        )}
        <View style={styles.containerInner}>
          <Animated.View style={txHeaderAnimatedStyle}>
            <View onLayout={onTransactionHeaderLayout}>
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

          <View style={styles.chromeRow}>
            <View style={styles.toolbarMain}>
              <Animated.View
                style={[styles.toolbarLayer, idleToolbarStyle]}
                pointerEvents={searchFieldFocused ? 'none' : 'auto'}
                importantForAccessibility={searchFieldFocused ? 'no-hide-descendants' : 'auto'}
              >
                <View style={styles.segmentIdleWrap}>
                  <SegmentedControl
                    variant="default"
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
                        className="rounded-full h-9 py-0"
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

          <Animated.ScrollView
            style={styles.list}
            scrollEventThrottle={16}
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              { paddingBottom: listScrollBottomPadding },
              filtered.length === 0 && styles.listEmpty,
            ]}
          >
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
      </Animated.View>
    </AppScreen>
  );
}
