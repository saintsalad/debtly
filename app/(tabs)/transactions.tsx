import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppScreen, useCollapsibleHeader } from '@/components/ui/AppScreen';
import { SearchField } from 'heroui-native';
import { ListFilter, Plus, Receipt, SearchX } from 'lucide-react-native';
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
  const palette = useColors();
  const shadow = useCardShadow();
  const styles = useMemo(() => createStyles(palette, shadow), [palette, shadow]);
  const [search, setSearch] = useState('');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
  const filterSheetRef = useRef<TransactionFilterSheetHandle>(null);
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
  const { onScroll, headerSpacerHeight } = useCollapsibleHeader();

  const openFilters = useCallback(() => {
    filterSheetRef.current?.present();
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
      <View style={[styles.container, { paddingTop: headerSpacerHeight }]}>
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

        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <SearchField value={search} onChange={setSearch}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search by name or note" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </View>
          <HeaderIconButton
            icon={ListFilter}
            accessibilityLabel="Filter transactions"
            onPress={openFilters}
            variant={hasActiveFilters ? 'tint' : 'secondary'}
          />
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
      </View>
    </AppScreen>
  );
}
