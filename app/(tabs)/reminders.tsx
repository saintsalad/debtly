import React from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isBefore, isToday, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebtStore } from '@/stores/debtStore';
import { Debt } from '@/features/debts/types';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface DebtSection {
  title: string;
  color: string;
  data: Debt[];
}

export default function RemindersScreen() {
  const debts = useDebtStore((s) => s.debts);
  const unpaid = debts.filter((d) => d.status === 'pending');

  const overdue: Debt[] = [];
  const dueToday: Debt[] = [];
  const upcoming: Debt[] = [];
  const noDueDate: Debt[] = [];
  const today = startOfDay(new Date());

  unpaid.forEach((d) => {
    if (!d.dueDate) { noDueDate.push(d); return; }
    const due = startOfDay(new Date(d.dueDate));
    if (isToday(new Date(d.dueDate))) dueToday.push(d);
    else if (isBefore(due, today)) overdue.push(d);
    else upcoming.push(d);
  });

  const { fmt } = useCurrency();

  const sections: DebtSection[] = [
    overdue.length > 0 && { title: 'Overdue', color: '#DC2626', data: overdue },
    dueToday.length > 0 && { title: 'Due Today', color: '#D97706', data: dueToday },
    upcoming.length > 0 && { title: 'Upcoming', color: '#2563EB', data: upcoming },
    noDueDate.length > 0 && { title: 'No Due Date', color: '#6B7280', data: noDueDate },
  ].filter(Boolean) as DebtSection[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {sections.length === 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Reminders</Text>
          </View>
          <EmptyState
            emoji="🎉"
            title="All caught up!"
            subtitle="No pending debts to track. Keep it up!"
          />
        </>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Reminders</Text>
              <Text style={styles.subtitle}>{unpaid.length} pending</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: (section as DebtSection).color }]} />
              <Text style={[styles.sectionLabel, { color: (section as DebtSection).color }]}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Avatar name={item.personName} size={42} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.personName}</Text>
                {item.note ? (
                  <Text style={styles.cardNote} numberOfLines={1}>{item.note}</Text>
                ) : null}
                {item.dueDate ? (
                  <Text style={styles.cardDue}>Due {formatDate(item.dueDate)}</Text>
                ) : null}
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.cardAmount, { color: item.type === 'owed_to_me' ? '#16A34A' : '#DC2626' }]}>
                  {item.type === 'owed_to_me' ? '+' : '−'}{fmt(item.amount)}
                </Text>
                <Badge status={getComputedStatus(item)} />
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  listContent: { paddingBottom: 120 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardNote: { fontSize: 12, color: '#9CA3AF' },
  cardDue: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
});
