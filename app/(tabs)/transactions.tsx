import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppScreen, useCollapsibleHeader } from '@/components/ui/AppScreen';
import { SearchField } from 'heroui-native';
import { Receipt, SearchX } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TransactionRow } from '@/features/debts/TransactionRow';
import { TransactionDetailSheet } from '@/features/debts/TransactionDetailSheet';
import { useDebtStore } from '@/stores/debtStore';
import { Debt } from '@/features/debts/types';
import { useCardShadow, useColors, layout, radius, space, type, type ColorPalette } from '@/lib/platform';

function createStyles(palette: ColorPalette, shadow: ReturnType<typeof useCardShadow>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: layout.screenPaddingX,
    },
    header: {
      paddingTop: space[4],
      paddingBottom: space[6],
    },
    title: {
      ...type.largeTitle,
      fontWeight: '600',
      color: palette.label,
    },
    subtitle: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginTop: space[1],
    },

    searchWrap: {
      marginBottom: space[3],
    },
    segmentWrap: {
      marginBottom: space[6],
    },
    list: {
      flex: 1,
    },
    listGroup: {
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadow,
    },
    listEmpty: {
      flexGrow: 1,
    },
  });
}

export default function TransactionsScreen() {
  const palette = useColors();
  const shadow = useCardShadow();
  const styles = useMemo(() => createStyles(palette, shadow), [palette, shadow]);
  const [search, setSearch] = useState('');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const debts = useDebtStore((s) => s.debts);

  const filtered = useMemo(() => {
    let list = debts;
    if (segmentIndex === 0) list = list.filter((d) => d.type === 'owed_to_me');
    if (segmentIndex === 1) list = list.filter((d) => d.type === 'i_owe');
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
  }, [debts, segmentIndex, search]);

  const handleSelect = (debt: Debt) => {
    setSelectedDebt(debt);
    setDetailOpen(true);
  };
  const { onScroll, headerSpacerHeight } = useCollapsibleHeader();

  return (
    <AppScreen>
      <View style={[styles.container, { paddingTop: headerSpacerHeight }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>{filtered.length} records</Text>
        </View>

        <View style={styles.searchWrap}>
          <SearchField value={search} onChange={setSearch}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search by name or note" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </View>

        <View style={styles.segmentWrap}>
          <SegmentedControl
            options={['Owed you', 'You owe']}
            selectedIndex={segmentIndex}
            onChange={setSegmentIndex}
          />
        </View>

        <Animated.FlatList
          style={styles.list}
          data={filtered}
          keyExtractor={(item) => item.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            filtered.length === 0 && styles.listEmpty,
            filtered.length > 0 && styles.listGroup,
          ]}
          renderItem={({ item, index }) => (
            <TransactionRow
              debt={item}
              onPress={() => handleSelect(item)}
              showSeparator={index < filtered.length - 1}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={search ? 'No results' : 'No transactions'}
              subtitle={
                search
                  ? 'Try a different name or note.'
                  : segmentIndex === 0
                  ? 'Debts owed to you will appear here.'
                  : 'Debts you owe will appear here.'
              }
              icon={
                search ? (
                  <SearchX size={40} color={palette.labelTertiary} />
                ) : (
                  <Receipt size={40} color={palette.labelTertiary} />
                )
              }
            />
          }
        />
      </View>

      <TransactionDetailSheet
        debt={selectedDebt}
        isOpen={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setTimeout(() => setSelectedDebt(null), 300);
        }}
      />
    </AppScreen>
  );
}

