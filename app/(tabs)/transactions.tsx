import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen, useCollapsibleHeader } from '@/components/ui/AppScreen';
import { SearchField } from 'heroui-native';
import { ListFilter, Plus, Receipt, SearchX, X } from 'lucide-react-native';
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
import { useAddDebt } from '@/lib/addDebtContext';
import { useTransactionDetail } from '@/lib/transactionDetailContext';
import { useDebtStore } from '@/stores/debtStore';
import { useCardShadow, useColors, layout, radius, space, type, type ColorPalette } from '@/lib/platform';

function createStyles(palette: ColorPalette, shadow: ReturnType<typeof useCardShadow>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: layout.screenPaddingX,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space[3],
      paddingTop: space[4],
      paddingBottom: space[6],
    },
    headerCopy: {
      flex: 1,
      gap: space[1],
    },
    title: {
      ...type.largeTitle,
      fontWeight: '600',
      color: palette.label,
    },
    subtitle: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.tint,
    },
    addButtonPressed: {
      opacity: 0.82,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      marginBottom: space[3],
    },
    searchField: {
      flex: 1,
      minWidth: 0,
    },
    searchTrailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      flexShrink: 0,
    },
    filterSlot: {
      width: 36,
      height: 36,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
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
    segmentWrap: {
      marginBottom: space[6],
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: layout.screenPaddingBottom,
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
  const palette = useColors();
  const shadow = useCardShadow();
  const styles = useMemo(() => createStyles(palette, shadow), [palette, shadow]);
  const compactContentTop = useMemo(() => insets.top + space[2], [insets.top]);
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
  /** Approximate until first layout; avoids a zero-height header on first paint. */
  const txHeaderHeight = useSharedValue(120);
  const screenTopPadding = useSharedValue(0);
  const closeTrackWidth = useSharedValue(0);
  const headerSpacerRef = useRef(0);
  const debts = useDebtStore((s) => s.debts);
  const { open: openTransactionDetail } = useTransactionDetail();
  const { present: presentAddDebt } = useAddDebt();
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
  const { onScroll, headerSpacerHeight, collapseMainHeader, expandMainHeader } = useCollapsibleHeader();

  const [searchFieldFocused, setSearchFieldFocused] = useState(false);

  const txHeaderAnimatedStyle = useAnimatedStyle(() => ({
    height: txHeaderHeight.value,
    overflow: 'hidden' as const,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    paddingTop: screenTopPadding.value,
  }));

  const closeTrackAnimatedStyle = useAnimatedStyle(() => ({
    width: closeTrackWidth.value,
    overflow: 'hidden' as const,
    height: 36,
    position: 'relative' as const,
  }));

  const onTransactionHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h <= 0 || searchFocusedRef.current) return;
    transactionHeaderNaturalHeight.current = h;
    if (!hasMeasuredTxHeader.current) {
      hasMeasuredTxHeader.current = true;
    }
    txHeaderHeight.value = h;
  }, [txHeaderHeight]);

  const endSearchChrome = useCallback(() => {
    searchFocusedRef.current = false;
    setSearchFieldFocused(false);
    expandMainHeader();
  }, [expandMainHeader]);

  useEffect(() => {
    headerSpacerRef.current = headerSpacerHeight;
  }, [headerSpacerHeight]);

  useEffect(() => {
    if (searchFieldFocused) {
      screenTopPadding.value = withTiming(compactContentTop, { duration: 220 });
      closeTrackWidth.value = withTiming(closeTrackMax, { duration: 220 });
    } else {
      if (headerSpacerHeight > 0) {
        screenTopPadding.value = withTiming(headerSpacerHeight, { duration: 220 });
      }
      closeTrackWidth.value = withTiming(0, { duration: 220 });
    }
  }, [
    searchFieldFocused,
    headerSpacerHeight,
    compactContentTop,
    closeTrackMax,
    screenTopPadding,
    closeTrackWidth,
  ]);

  useEffect(() => {
    if (searchFieldFocused) {
      txHeaderHeight.value = withTiming(0, { duration: 220 });
      return;
    }
    if (!hasMeasuredTxHeader.current) return;
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
        expandMainHeader();
        const target = transactionHeaderNaturalHeight.current || 96;
        txHeaderHeight.value = target;
        const topSnap = headerSpacerRef.current > 0 ? headerSpacerRef.current : insets.top + space[2];
        screenTopPadding.value = topSnap;
        closeTrackWidth.value = 0;
      };
    }, [closeTrackWidth, expandMainHeader, insets.top, screenTopPadding, txHeaderHeight])
  );

  const handleSearchFocus = useCallback(() => {
    searchFocusedRef.current = true;
    setSearchFieldFocused(true);
    collapseMainHeader();
  }, [collapseMainHeader]);

  const handleSearchBlur = useCallback(() => {
    if (suppressSearchBlurRef.current) return;
    endSearchChrome();
  }, [endSearchChrome]);

  const handleCloseSearchChrome = useCallback(() => {
    searchInputRef.current?.blur();
  }, []);

  const openFilters = useCallback(() => {
    filterSheetRef.current?.present();
    setTimeout(() => {
      suppressSearchBlurRef.current = false;
    }, 600);
  }, []);

  const suppressBlurForFilter = useCallback(() => {
    suppressSearchBlurRef.current = true;
  }, []);

  const emptySubtitle = useMemo(() => {
    if (search) return 'Try a different name or note.';
    if (hasActiveFilters) return 'Try changing or clearing your filters.';
    if (segmentIndex === 1) return 'Debts owed to you will appear here.';
    if (segmentIndex === 2) return 'Debts you owe will appear here.';
    return 'Your transactions will appear here.';
  }, [hasActiveFilters, search, segmentIndex]);

  return (
    <AppScreen>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        <Animated.View style={txHeaderAnimatedStyle}>
          <View onLayout={onTransactionHeaderLayout}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Transactions</Text>
                <Text style={styles.subtitle}>{filtered.length} records</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add transaction"
                onPress={presentAddDebt}
                style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true }}
              >
                <Plus size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <View style={styles.searchRow}>
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
            <View style={styles.filterSlot}>
              <HeaderIconButton
                icon={ListFilter}
                accessibilityLabel="Filter transactions"
                onPressIn={suppressBlurForFilter}
                onPress={openFilters}
                variant={hasActiveFilters ? 'tint' : 'secondary'}
                iconSize={20}
              />
            </View>
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
        </View>

        <View style={styles.segmentWrap}>
          <SegmentedControl
            options={['All', 'Owed you', 'You owe']}
            selectedIndex={segmentIndex}
            onChange={setSegmentIndex}
          />
        </View>

        <Animated.ScrollView
          style={styles.list}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
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
      </Animated.View>
    </AppScreen>
  );
}
