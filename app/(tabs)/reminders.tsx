import React from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { isBefore, isToday, startOfDay } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebtStore } from '@/stores/debtStore';
import { Debt } from '@/features/debts/types';
import { formatDate, getComputedStatus } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { colors, type, space, radius, cardShadow } from '@/lib/platform';

interface DebtSection {
  title: string;
  accent: string;
  data: Debt[];
}

export default function RemindersScreen() {
  const debts = useDebtStore((s) => s.debts);
  const unpaid = debts.filter((d) => d.status === 'pending');
  const { fmt } = useCurrency();

  const overdue: Debt[] = [];
  const dueToday: Debt[] = [];
  const upcoming: Debt[] = [];
  const later: Debt[] = [];
  const today = startOfDay(new Date());

  unpaid.forEach((d) => {
    if (!d.dueDate) { later.push(d); return; }
    const due = startOfDay(new Date(d.dueDate));
    if (isToday(new Date(d.dueDate))) dueToday.push(d);
    else if (isBefore(due, today)) overdue.push(d);
    else upcoming.push(d);
  });

  const sections: DebtSection[] = [
    overdue.length > 0   && { title: 'Overdue',   accent: colors.negative, data: overdue },
    dueToday.length > 0  && { title: 'Due today',  accent: colors.warning,  data: dueToday },
    upcoming.length > 0  && { title: 'Upcoming',   accent: colors.tint,     data: upcoming },
    later.length > 0     && { title: 'No due date', accent: colors.labelSecondary, data: later },
  ].filter(Boolean) as DebtSection[];

  if (sections.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Reminders</Text>
        </View>
        <EmptyState
          title="All clear"
          subtitle="No pending debts to track."
          icon={<MaterialIcons name="notifications-none" size={40} color={colors.labelTertiary} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Reminders</Text>
            <Text style={styles.pageSubtitle}>{unpaid.length} pending</Text>
          </View>
        }
        renderSectionHeader={({ section }) => {
          const sec = section as DebtSection;
          return (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: sec.accent }]}>{sec.title}</Text>
            </View>
          );
        }}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
        renderItem={({ item, index, section }) => {
          const sec = section as DebtSection;
          const isFirst = index === 0;
          const isLast = index === sec.data.length - 1;
          const status = getComputedStatus(item);
          const isCredit = item.type === 'owed_to_me';
          const amountColor = isCredit ? colors.positive : colors.negative;
          const dueDateColor = status === 'overdue' ? colors.negative : colors.labelSecondary;

          return (
            <>
              <View style={[
                styles.card,
                isFirst && styles.cardFirst,
                isLast && styles.cardLast,
              ]}>
                <Avatar name={item.personName} size={38} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{item.personName}</Text>
                  {item.note ? <Text style={styles.cardNote} numberOfLines={1}>{item.note}</Text> : null}
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cardAmount, { color: amountColor }]}>
                    {isCredit ? '+' : '−'}{fmt(item.amount)}
                  </Text>
                  {item.dueDate ? (
                    <Text style={[styles.cardDue, { color: dueDateColor }]}>
                      {formatDate(item.dueDate)}
                    </Text>
                  ) : null}
                </View>
              </View>
              {!isLast && (
                <View style={[styles.rowSeparator, { marginLeft: space[5] + 38 + space[3] }]} />
              )}
            </>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingBottom: 120 },
  header: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[5],
  },
  pageTitle: { ...type.title1, color: colors.label },
  pageSubtitle: { ...type.footnote, color: colors.labelSecondary, marginTop: 2 },
  sectionHeader: {
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
  sectionTitle: {
    ...type.footnote,
    fontWeight: '500',
  },
  sectionFooter: { height: space[4] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: space[5],
    paddingVertical: 13,
    gap: space[3],
    ...cardShadow,
  },
  cardFirst: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  cardLast: {
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  cardBody: { flex: 1, gap: 2 },
  cardName: { ...type.subheadline, fontWeight: '500', color: colors.label },
  cardNote: { ...type.caption1, color: colors.labelSecondary },
  cardRight: { alignItems: 'flex-end', gap: 3 },
  cardAmount: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  cardDue: { ...type.caption1 },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.opaqueSeparator,
    marginRight: space[5],
  },
});
