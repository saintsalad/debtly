import React, { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddDebtSheet, AddDebtSheetHandle } from '@/features/debts/AddDebtSheet';
import { DebtCard } from '@/features/debts/DebtCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { useDebtSummary } from '@/stores/debtStore';
import { useProfileStore } from '@/stores/profileStore';

export default function HomeScreen() {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const addDebtRef = useRef<AddDebtSheetHandle>(null);

  const { owedToMe, iOwe, totalOwedToMe, totalIOwe } = useDebtSummary();
  const name = useProfileStore((s) => s.name);

  const activeList = segmentIndex === 0 ? owedToMe : iOwe;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={activeList}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Greeting */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting},</Text>
                <Text style={styles.name}>{name} 👋</Text>
              </View>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <SummaryCard
                label="Owed to You"
                amount={totalOwedToMe}
                count={owedToMe.length}
                accentColor="#16A34A"
                bgColor="#F0FDF4"
              />
              <View style={styles.cardGap} />
              <SummaryCard
                label="You Owe"
                amount={totalIOwe}
                count={iOwe.length}
                accentColor="#DC2626"
                bgColor="#FEF2F2"
              />
            </View>

            {/* Segmented Control */}
            <View style={styles.segmentWrapper}>
              <SegmentedControl
                options={['Owed To You', 'You Owe']}
                selectedIndex={segmentIndex}
                onChange={setSegmentIndex}
              />
            </View>

            {activeList.length > 0 && (
              <Text style={styles.sectionMeta}>
                {activeList.length} {activeList.length === 1 ? 'debt' : 'debts'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => <DebtCard debt={item} index={index} />}
        ListEmptyComponent={
          <EmptyState
            emoji={segmentIndex === 0 ? '🤝' : '🎉'}
            title={segmentIndex === 0 ? 'All clear!' : 'Nothing owed'}
            subtitle={
              segmentIndex === 0
                ? "Nobody owes you anything right now."
                : "You don't owe anyone. You're free!"
            }
          />
        }
      />

      <FAB onPress={() => addDebtRef.current?.present()} bottom={100} />
      <AddDebtSheet ref={addDebtRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  listContent: { paddingBottom: 130 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cardGap: { width: 12 },
  segmentWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
});
