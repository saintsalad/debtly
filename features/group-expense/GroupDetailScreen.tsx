import React, { useCallback, useMemo, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreHorizontal, UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ListDivider } from '@/components/ui/ListDivider';
import { ActivityFeedItem } from '@/features/group-expense/ActivityFeedItem';
import { AddExpenseSheet, type AddExpenseSheetHandle } from '@/features/group-expense/AddExpenseSheet';
import { buildGroupActivity } from '@/features/group-expense/activityFeed';
import { isExpenseTappable } from '@/features/group-expense/activityLog';
import { GroupBalanceHero } from '@/features/group-expense/GroupBalanceHero';
import { GroupQuickActions } from '@/features/group-expense/GroupQuickActions';
import { selectGroupBalances } from '@/features/group-expense/balanceEngine';
import { shareGroupSummary, sendGroupReminder } from '@/features/group-expense/groupExpenseActions';
import { InviteMembersSheet, type InviteMembersSheetHandle } from '@/features/group-expense/InviteMembersSheet';
import { MemberBalanceRow } from '@/features/group-expense/MemberBalanceRow';
import {
  RecordSettlementSheet,
  type RecordSettlementSheetHandle,
} from '@/features/group-expense/RecordSettlementSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCurrency } from '@/hooks/useCurrency';
import { CURRENCIES } from '@/lib/utils';
import { layout, space, type, useColors, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    inner: {
      flex: 1,
      paddingHorizontal: layout.screenPaddingX,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingBottom: space[3],
    },
    title: {
      flex: 1,
      ...type.headline,
      fontWeight: '600',
      color: palette.label,
      textAlign: 'center',
    },
    scroll: { flex: 1 },
    content: {
      gap: space[5],
      paddingBottom: space[10],
    },
    sectionTitle: {
      ...type.subheadline,
      fontWeight: '600',
      color: palette.labelSecondary,
      marginBottom: space[1],
    },
    sectionHint: {
      ...type.caption1,
      marginBottom: space[2],
    },
    heroCard: {
      paddingVertical: space[2],
    },
  });
}

export function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { fmt } = useCurrency();
  const currency = useProfileStore((s) => s.currency);
  const currencySymbol = CURRENCIES[currency]?.symbol ?? currency;

  const group = useGroupExpenseStore((s) => s.getGroup(id ?? ''));
  const expenses = useGroupExpenseStore((s) => s.expenses);
  const settlements = useGroupExpenseStore((s) => s.settlements);
  const activityLog = useGroupExpenseStore((s) => s.activityLog);
  const deleteGroup = useGroupExpenseStore((s) => s.deleteGroup);

  const expenseSheetRef = useRef<AddExpenseSheetHandle>(null);
  const settlementSheetRef = useRef<RecordSettlementSheetHandle>(null);
  const inviteSheetRef = useRef<InviteMembersSheetHandle>(null);

  const summary = useMemo(
    () => (group ? selectGroupBalances(group, expenses, settlements) : null),
    [group, expenses, settlements]
  );

  const activity = useMemo(() => {
    if (!group) return [];
    return buildGroupActivity(group, activityLog);
  }, [group, activityLog]);

  const openSettle = useCallback(() => {
    if (!group || !summary) return;
    const currentUser = group.members.find((m) => m.isCurrentUser);
    const owingYou = summary.pairwise.find((p) => p.netMinor > 0);
    const youOwe = summary.pairwise.find((p) => p.netMinor < 0);

    if (owingYou && currentUser) {
      settlementSheetRef.current?.present(group.id, {
        fromMemberId: owingYou.memberId,
        toMemberId: currentUser.id,
        amountMinor: owingYou.netMinor,
      });
      return;
    }
    if (youOwe && currentUser) {
      settlementSheetRef.current?.present(group.id, {
        fromMemberId: currentUser.id,
        toMemberId: youOwe.memberId,
        amountMinor: Math.abs(youOwe.netMinor),
      });
      return;
    }
    settlementSheetRef.current?.present(group.id);
  }, [group, summary]);

  const showMenu = () => {
    if (!group) return;
    Alert.alert(group.name, undefined, [
      {
        text: 'Share summary',
        onPress: () =>
          void shareGroupSummary(group, expenses, settlements, fmt, currencySymbol),
      },
      {
        text: 'Delete group',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete group?', 'All expenses and settlements will be removed.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                deleteGroup(group.id);
                router.back();
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!group || !summary) {
    return (
      <AppScreen>
        <EmptyState title="Group not found" subtitle="This group may have been deleted." />
      </AppScreen>
    );
  }

  const nonZeroBalances = summary.memberBalances.filter(
    (b) => !b.isCurrentUser && b.netMinor !== 0
  );

  return (
    <AppScreen reserveTabBarInset={false}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} translucent />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <HeaderIconButton
              icon={ChevronLeft}
              accessibilityLabel="Back"
              onPress={() => router.back()}
              variant="secondary"
            />
            <Text style={styles.title} numberOfLines={1}>
              {group.name}
            </Text>
            <HeaderIconButton
              icon={UserPlus}
              accessibilityLabel="Invite members"
              onPress={() => inviteSheetRef.current?.present(group.id)}
              variant="secondary"
            />
            <HeaderIconButton
              icon={MoreHorizontal}
              accessibilityLabel="More options"
              onPress={showMenu}
              variant="secondary"
            />
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <GlassCard style={styles.heroCard}>
              <GroupBalanceHero
                summary={summary}
                totalSpendMinor={summary.totalSpendMinor}
              />
            </GlassCard>

            <GroupQuickActions
              onAddExpense={() => expenseSheetRef.current?.present(group.id)}
              onSettle={openSettle}
            />

            {nonZeroBalances.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Balances</Text>
                <GlassCard>
                  {nonZeroBalances.map((bal, index) => (
                    <View key={bal.memberId}>
                      <MemberBalanceRow
                        balance={bal}
                        onRemind={() =>
                          sendGroupReminder(
                            bal.displayName,
                            Math.abs(bal.netMinor),
                            group.name,
                            fmt
                          )
                        }
                      />
                      {index < nonZeroBalances.length - 1 ? (
                        <ListDivider variant="glass" />
                      ) : null}
                    </View>
                  ))}
                </GlassCard>
              </View>
            ) : null}

            <View>
              <Text style={styles.sectionTitle}>Expenses & activity</Text>
              <Text style={[styles.sectionHint, { color: palette.labelTertiary }]}>
                Tap an expense to view or edit the split
              </Text>
              {activity.length === 0 ? (
                <EmptyState
                  title="No expenses yet"
                  subtitle="Tap Add expense to split your first bill."
                />
              ) : (
                <GlassCard>
                  {activity.map((item, index) => (
                    <View key={item.id}>
                      <ActivityFeedItem
                        item={item}
                        onPress={
                          isExpenseTappable(item.kind, item.expenseId, expenses)
                            ? () =>
                                expenseSheetRef.current?.present(group.id, item.expenseId)
                            : undefined
                        }
                      />
                      {index < activity.length - 1 ? (
                        <ListDivider variant="glass" />
                      ) : null}
                    </View>
                  ))}
                </GlassCard>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      <AddExpenseSheet ref={expenseSheetRef} />
      <RecordSettlementSheet ref={settlementSheetRef} />
      <InviteMembersSheet ref={inviteSheetRef} />
    </AppScreen>
  );
}
