import { AppScreen } from '@/components/ui/AppScreen';
import { AvatarStack, sortMembersForStack } from '@/components/ui/AvatarStack';
import { ContextMenuDropdown, type ContextMenuSection } from '@/components/ui/ContextMenuDropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ListDivider } from '@/components/ui/ListDivider';
import { buildGroupActivity } from '@/features/group-expense/activityFeed';
import { ActivityFeedItem } from '@/features/group-expense/ActivityFeedItem';
import { isExpenseTappable } from '@/features/group-expense/activityLog';
import { AddExpenseSheet, type AddExpenseSheetHandle } from '@/features/group-expense/AddExpenseSheet';
import { selectGroupBalances, settlementsExistBetweenMembers } from '@/features/group-expense/balanceEngine';
import { GroupBalanceHero } from '@/features/group-expense/GroupBalanceHero';
import {
  openOwedBalanceSms,
  recentGroupExpenseTitles,
  shareGroupSummary,
} from '@/features/group-expense/groupExpenseActions';
import { GroupMembersSheet, type GroupMembersSheetHandle } from '@/features/group-expense/GroupMembersSheet';
import { GroupQuickActions } from '@/features/group-expense/GroupQuickActions';
import { InviteMembersSheet, type InviteMembersSheetHandle } from '@/features/group-expense/InviteMembersSheet';
import { MemberBalanceRow } from '@/features/group-expense/MemberBalanceRow';
import { pickGroupPhotoFromLibrary } from '@/features/group-expense/pickGroupPhoto';
import {
  RecordSettlementSheet,
  type RecordSettlementSheetHandle,
} from '@/features/group-expense/RecordSettlementSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCurrency } from '@/hooks/useCurrency';
import { minorToMajor } from '@/features/debts/money';
import { notifySuccess } from '@/lib/appToast';
import { layout, radius, space, type, useCardShadow, useColors, type ColorPalette } from '@/lib/platform';
import { CURRENCIES } from '@/lib/utils';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useToast } from 'heroui-native';
import { Camera, ChevronLeft, MoreHorizontal, Printer, Share2, Trash2, UserPlus } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HERO_CARD_MIN_HEIGHT = 304;
const HERO_GRADIENT_TOP = 56;
const FOOTER_TOP_RADIUS = 20;

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
    heroShell: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: palette.fill,
    },
    heroShellNoPhoto: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: palette.surface,
    },
    heroFullBleed: {
      width: '100%',
      minHeight: HERO_CARD_MIN_HEIGHT,
    },
    heroImage: {
      ...StyleSheet.absoluteFillObject,
    },
    heroGradientTop: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: HERO_GRADIENT_TOP,
    },
    heroCameraFab: {
      position: 'absolute',
      top: space[3],
      right: space[3],
      zIndex: 2,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    heroFooter: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: FOOTER_TOP_RADIUS,
      borderTopRightRadius: FOOTER_TOP_RADIUS,
      overflow: 'hidden',
    },
    heroFooterGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    heroFooterInner: {
      paddingHorizontal: space[4],
      paddingTop: space[3],
      paddingBottom: space[4],
    },
    heroAvatarTopLeft: {
      position: 'absolute',
      top: space[3],
      left: space[3],
      zIndex: 2,
    },
    heroFullBleedColumn: {
      flexDirection: 'column',
      minHeight: HERO_CARD_MIN_HEIGHT,
    },
    heroNoPhotoTop: {
      flex: 1,
      minHeight: 120,
      position: 'relative',
    },
    heroNoPhotoTapArea: {
      flex: 1,
    },
    heroCameraFabPlain: {
      backgroundColor: palette.fill,
      borderColor: palette.separator,
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
  const cardShadow = useCardShadow();
  const { fmt } = useCurrency();
  const currency = useProfileStore((s) => s.currency);
  const currencySymbol = CURRENCIES[currency]?.symbol ?? currency;

  const group = useGroupExpenseStore((s) => s.getGroup(id ?? ''));
  const expenses = useGroupExpenseStore((s) => s.expenses);
  const settlements = useGroupExpenseStore((s) => s.settlements);
  const activityLog = useGroupExpenseStore((s) => s.activityLog);
  const deleteGroup = useGroupExpenseStore((s) => s.deleteGroup);
  const setGroupImage = useGroupExpenseStore((s) => s.setGroupImage);
  const recordSettlement = useGroupExpenseStore((s) => s.recordSettlement);
  const voidRecordedSettlementsWithMember = useGroupExpenseStore(
    (s) => s.voidRecordedSettlementsWithMember
  );

  const expenseSheetRef = useRef<AddExpenseSheetHandle>(null);
  const settlementSheetRef = useRef<RecordSettlementSheetHandle>(null);
  const inviteSheetRef = useRef<InviteMembersSheetHandle>(null);
  const membersSheetRef = useRef<GroupMembersSheetHandle>(null);
  const moreMenuAnchorRef = useRef<View>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { toast } = useToast();

  const summary = useMemo(
    () => (group ? selectGroupBalances(group, expenses, settlements) : null),
    [group, expenses, settlements]
  );

  const activity = useMemo(() => {
    if (!group) return [];
    return buildGroupActivity(group, activityLog);
  }, [group, activityLog]);

  const stackMembers = useMemo(
    () => (group ? sortMembersForStack(group.members) : []),
    [group]
  );

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
    notifySuccess(
      toast,
      "You're all settled up",
      'There is no balance to settle with anyone in this group.'
    );
  }, [group, summary, toast]);

  const openGroupPhotoOptions = useCallback(() => {
    if (!group) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const choosePhoto = async () => {
      const uri = await pickGroupPhotoFromLibrary();
      if (uri) {
        setGroupImage(group.id, uri);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notifySuccess(toast, 'Photo updated');
      }
    };

    const buttons: {
      text: string;
      style?: 'destructive' | 'cancel';
      onPress?: () => void;
    }[] = [
        { text: 'Choose photo', onPress: () => void choosePhoto() },
      ];

    if (group.imageUri) {
      buttons.push({
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => {
          setGroupImage(group.id, undefined);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          notifySuccess(toast, 'Photo removed');
        },
      });
    }

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Group photo', 'Add or change the banner image for this group.', buttons);
  }, [group, setGroupImage, toast]);

  const closeMoreMenu = useCallback(() => setMoreMenuOpen(false), []);

  const groupMoreMenuSections = useMemo((): ContextMenuSection[] => {
    if (!group) return [];
    return [
      {
        items: [
          {
            id: 'photo',
            title: 'Group photo',
            icon: Camera,
            onPress: () => openGroupPhotoOptions(),
          },
          {
            id: 'share',
            title: 'Share summary',
            icon: Share2,
            onPress: () =>
              void shareGroupSummary(group, expenses, settlements, fmt, currencySymbol),
          },
          {
            id: 'print-receipt',
            title: 'Print receipt',
            icon: Printer,
            onPress: () => {
              closeMoreMenu();
              router.push({
                pathname: '/group-receipt/[id]',
                params: { id: group.id },
              });
            },
          },
        ],
      },
      {
        items: [
          {
            id: 'delete',
            title: 'Delete group',
            icon: Trash2,
            destructive: true,
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
        ],
      },
    ];
  }, [group, expenses, settlements, fmt, currencySymbol, openGroupPhotoOptions, deleteGroup, router, closeMoreMenu]);

  const currentUserId = useMemo(
    () => group?.members.find((m) => m.isCurrentUser)?.id,
    [group]
  );

  const balanceRows = useMemo(() => {
    if (!summary || !group || !currentUserId) return [];
    return summary.memberBalances
      .filter(
        (b) =>
          !b.isCurrentUser &&
          (b.netMinor !== 0 ||
            settlementsExistBetweenMembers(
              settlements,
              group.id,
              currentUserId,
              b.memberId
            ))
      )
      .slice()
      .sort((a, b) => {
        const za = a.netMinor === 0 ? 1 : 0;
        const zb = b.netMinor === 0 ? 1 : 0;
        if (za !== zb) return za - zb;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [summary, group, settlements, currentUserId]);

  const balanceShareExpenseTitles = useMemo(
    () => (group ? recentGroupExpenseTitles(group.id, expenses, 8) : []),
    [group, expenses]
  );

  const activityHighlightMemberNames = useMemo(
    () =>
      group
        ? group.members.map((m) => m.displayName).filter((n) => n.trim().length > 0)
        : [],
    [group]
  );

  if (!group || !summary) {
    return (
      <AppScreen>
        <EmptyState title="Group not found" subtitle="This group may have been deleted." />
      </AppScreen>
    );
  }

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
            <View ref={moreMenuAnchorRef} collapsable={false}>
              <HeaderIconButton
                icon={MoreHorizontal}
                accessibilityLabel="More options"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMoreMenuOpen(true);
                }}
                variant="secondary"
              />
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[group.imageUri ? styles.heroShell : styles.heroShellNoPhoto, cardShadow]}>
              {group.imageUri ? (
                <View style={styles.heroFullBleed}>
                  <Image
                    source={{ uri: group.imageUri }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={200}
                  />

                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(0,0,0,0.28)', 'transparent']}
                    locations={[0, 1]}
                    style={styles.heroGradientTop}
                  />

                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      membersSheetRef.current?.present(group.id);
                    }}
                    style={styles.heroAvatarTopLeft}
                    accessibilityRole="button"
                    accessibilityLabel="View and manage group members"
                  >
                    <AvatarStack
                      members={stackMembers}
                      size={36}
                      maxVisible={5}
                      overlay
                    />
                  </Pressable>

                  <Pressable
                    onPress={openGroupPhotoOptions}
                    style={styles.heroCameraFab}
                    accessibilityRole="button"
                    accessibilityLabel="Change group photo"
                  >
                    <Camera size={20} color="rgba(255,255,255,0.95)" strokeWidth={2} />
                  </Pressable>

                  <View style={styles.heroFooter}>
                    <LinearGradient
                      pointerEvents="none"
                      colors={['transparent', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.84)']}
                      locations={[0, 0.32, 1]}
                      style={styles.heroFooterGradient}
                    />
                    <View style={styles.heroFooterInner}>
                      <GroupBalanceHero
                        summary={summary}
                        totalSpendMinor={summary.totalSpendMinor}
                        groupId={group.id}
                        currentUserId={group.members.find((m) => m.isCurrentUser)?.id}
                        settlements={settlements}
                        overlay
                        compact
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[styles.heroFullBleed, styles.heroFullBleedColumn]}>
                  <View style={styles.heroNoPhotoTop}>
                    <Pressable
                      onPress={openGroupPhotoOptions}
                      style={styles.heroNoPhotoTapArea}
                      accessibilityRole="button"
                      accessibilityLabel="Add group cover photo"
                    />

                    <Pressable
                      onPress={openGroupPhotoOptions}
                      style={[styles.heroCameraFab, styles.heroCameraFabPlain]}
                      accessibilityRole="button"
                      accessibilityLabel="Add group photo"
                    >
                      <Camera size={20} color={palette.label} strokeWidth={2} />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        membersSheetRef.current?.present(group.id);
                      }}
                      style={styles.heroAvatarTopLeft}
                      accessibilityRole="button"
                      accessibilityLabel="View and manage group members"
                    >
                      <AvatarStack
                        members={stackMembers}
                        size={36}
                        maxVisible={5}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.heroFooterInner}>
                    <GroupBalanceHero
                      summary={summary}
                      totalSpendMinor={summary.totalSpendMinor}
                      groupId={group.id}
                      currentUserId={group.members.find((m) => m.isCurrentUser)?.id}
                      settlements={settlements}
                      compact
                    />
                  </View>
                </View>
              )}
            </View>

            <GroupQuickActions
              onAddExpense={() => expenseSheetRef.current?.present(group.id)}
              onSettle={openSettle}
              settleWithEveryoneClear={summary.isSettled}
            />

            {balanceRows.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Balances</Text>
                <GlassCard>
                  {balanceRows.map((bal, index) => {
                    const hasPair = settlementsExistBetweenMembers(
                      settlements,
                      group.id,
                      currentUserId!,
                      bal.memberId
                    );
                    return (
                    <View key={bal.memberId}>
                      <MemberBalanceRow
                        balance={bal}
                        hasRecordedSettlements={hasPair}
                        onSendMessage={() =>
                          openOwedBalanceSms(
                            bal.displayName,
                            bal.netMinor,
                            group.name,
                            fmt,
                            balanceShareExpenseTitles
                          )
                        }
                        onMarkPaid={() => {
                          const err = recordSettlement({
                            groupId: group.id,
                            fromMemberId:
                              bal.netMinor > 0 ? bal.memberId : currentUserId!,
                            toMemberId:
                              bal.netMinor > 0 ? currentUserId! : bal.memberId,
                            amount: minorToMajor(Math.abs(bal.netMinor)),
                          });
                          if (err) {
                            Alert.alert('Could not record payment', err);
                            return;
                          }
                          notifySuccess(toast, 'Marked as paid', 'Balances and activity are updated.');
                        }}
                        onMarkUnpaid={() =>
                          voidRecordedSettlementsWithMember(
                            group.id,
                            currentUserId!,
                            bal.memberId
                          )
                        }
                      />
                      {index < balanceRows.length - 1 ? (
                        <ListDivider variant="glass" />
                      ) : null}
                    </View>
                    );
                  })}
                </GlassCard>
              </View>
            ) : null}

            <View>
              <Text style={styles.sectionTitle}>Expenses & activity</Text>
              <Text style={[styles.sectionHint, { color: palette.labelTertiary }]}>
                Tap an expense to view or edit it
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
                        highlightMemberNames={activityHighlightMemberNames}
                        onPress={
                          isExpenseTappable(item.kind, item.expenseId, expenses)
                            ? () =>
                              expenseSheetRef.current?.present(group.id, item.expenseId)
                            : undefined
                        }
                      />
                      {index < activity.length - 1 ? (
                        <ListDivider bleedHorizontal={space[4]} variant="glass" />
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
      <GroupMembersSheet ref={membersSheetRef} />
      <ContextMenuDropdown
        visible={moreMenuOpen}
        onClose={closeMoreMenu}
        anchorRef={moreMenuAnchorRef}
        sections={groupMoreMenuSections}
      />
    </AppScreen>
  );
}
