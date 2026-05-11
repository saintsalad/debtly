import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchField } from 'heroui-native';
import { Receipt, SearchX } from 'lucide-react-native';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionRow } from '@/features/debts/TransactionRow';
import { TransactionDetailSheet } from '@/features/debts/TransactionDetailSheet';
import { useDebtStore } from '@/stores/debtStore';
import { Debt } from '@/features/debts/types';
import { colors, space, type } from '@/lib/platform';

export default function TransactionsScreen() {
  const [search, setSearch] = useState('');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const debts = useDebtStore((s) => s.debts);

  const filtered = useMemo(() => {
    let list = debts;
    if (segmentIndex === 1) list = list.filter((d) => d.type === 'owed_to_me');
    if (segmentIndex === 2) list = list.filter((d) => d.type === 'i_owe');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.personName.toLowerCase().includes(q) ||
          (d.note ?? '').toLowerCase().includes(q)
      );
    }
    // Most recent first
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [debts, segmentIndex, search]);

  const handleSelect = (debt: Debt) => {
    setSelectedDebt(debt);
    setDetailOpen(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>{filtered.length} records</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchField value={search} onChange={setSearch}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search by name or note..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </View>

      {/* Filter tabs */}
      <View style={styles.segmentWrap}>
        <SegmentedControl
          options={['All', 'Receivable', 'Payable']}
          selectedIndex={segmentIndex}
          onChange={setSegmentIndex}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listEmpty,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TransactionRow debt={item} onPress={() => handleSelect(item)} />
        )}
        ListEmptyComponent={
          <EmptyState
            title={search ? 'No results' : 'No transactions'}
            subtitle={
              search
                ? 'Try a different name or note.'
                : segmentIndex === 1
                ? 'Debts owed to you will appear here.'
                : segmentIndex === 2
                ? 'Debts you owe will appear here.'
                : 'Tap + to add your first debt.'
            }
            icon={
              search ? (
                <SearchX size={40} color={colors.labelTertiary} />
              ) : (
                <Receipt size={40} color={colors.labelTertiary} />
              )
            }
          />
        }
      />

      <TransactionDetailSheet
        debt={selectedDebt}
        isOpen={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setTimeout(() => setSelectedDebt(null), 300);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[3],
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space[2],
  },
  title: {
    ...type.title1,
    color: colors.label,
  },
  subtitle: {
    ...type.footnote,
    color: colors.labelTertiary,
  },

  searchWrap: {
    paddingHorizontal: space[5],
    marginBottom: space[3],
  },
  segmentWrap: {
    paddingHorizontal: space[5],
    marginBottom: space[4],
  },

  listContent: {
    paddingHorizontal: space[5],
    paddingBottom: 120,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: space[2],
  },
});
