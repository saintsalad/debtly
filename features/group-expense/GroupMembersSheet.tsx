import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Pencil, Trash2 } from 'lucide-react-native';
import { HeroUINativeProvider, useToast } from 'heroui-native';
import { Avatar } from '@/components/ui/Avatar';
import { GlassButton } from '@/components/ui/GlassButton';
import { ListDivider } from '@/components/ui/ListDivider';
import type { GroupMember } from '@/features/group-expense/types';
import { isViewerGroupHost } from '@/features/group-expense/activityLog';
import { isCloudSplitGroup } from '@/features/group-expense/mergeConvexSplitSnapshot';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useSubmitGuard } from '@/hooks/use-submit-guard';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import {
  screenHeaderLayerStyle,
  scrollContentLayerStyle,
  SheetSurfaceScrollFadeStrip,
  useSheetSurfaceScrollFade,
} from '@/lib/statusBarScrollFade';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const AnimatedBottomSheetScrollView = Animated.createAnimatedComponent(BottomSheetScrollView);

/** Over-scroll padding so rows clear the floating “Members” title block. */
const MEMBERS_HEADER_SCROLL_PADDING_TOP = 72;
/** Gradient height under title area (Insights-style pacing). */
const MEMBERS_SHEET_SCROLL_FADE_HEIGHT = 96;

export interface GroupMembersSheetHandle {
  present: (groupId: string) => void;
  dismiss: () => void;
}

function sortMembers(members: GroupMember[]): GroupMember[] {
  return [...members].sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

/** One-line status for placeholders vs Convex-linked seats vs offline-only roster. */
function memberSubtitle(member: GroupMember, groupIsCloud: boolean): string {
  if (member.isCurrentUser) {
    return groupIsCloud ? 'You · Debtly account' : 'You';
  }
  if (groupIsCloud) {
    return member.isPlaceholder === true
      ? 'Name only · not linked yet'
      : 'Joined · Debtly account';
  }
  if (member.isPlaceholder === false) return 'Joined on this device';
  return 'Added on this device';
}

function createSheetStyles(palette: ColorPalette) {
  return StyleSheet.create({
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: palette.surface,
    },
    sheetBody: {
      flex: 1,
      position: 'relative',
    },
    handle: { width: 40, backgroundColor: palette.opaqueSeparator },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      backgroundColor: 'transparent',
    },
    title: { ...type.headline, fontWeight: '600', color: palette.label },
    subtitle: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginTop: space[1],
    },
    content: {
      paddingHorizontal: space[5],
      gap: space[3],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[3],
      minHeight: 56,
    },
    body: { flex: 1, minWidth: 0, gap: 2 },
    name: {
      ...type.subheadline,
      fontWeight: '500',
      fontFamily: sansForWeight('500'),
      color: palette.label,
    },
    meta: {
      ...type.caption1,
      color: palette.labelTertiary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.fill,
    },
    iconButtonDanger: {
      backgroundColor: palette.negativeSoft,
    },
    renameBlock: {
      gap: space[2],
      paddingVertical: space[2],
    },
    renameInput: {
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: 14,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    renameActions: {
      flexDirection: 'row',
      gap: space[2],
    },
    footer: {
      paddingHorizontal: space[5],
      paddingTop: space[2],
    },
    claimSeatPressable: {
      marginTop: space[2],
      alignSelf: 'flex-start',
    },
    claimSeatText: {
      ...type.caption1,
      fontFamily: sansForWeight('600'),
      fontWeight: '600',
      color: palette.tint,
    },
    claimSeatTextDisabled: {
      color: palette.labelTertiary,
    },
  });
}

interface MemberRowProps {
  member: GroupMember;
  canRenameMember: boolean;
  canRemoveMember: boolean;
  groupIsCloud: boolean;
  isRenaming: boolean;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onRemove: () => void;
  onClaimSeat?: (member: GroupMember) => void;
  claimSeatBusy: boolean;
  styles: ReturnType<typeof createSheetStyles>;
  palette: ColorPalette;
  keyboardAppearance: 'light' | 'dark';
  renameSaveBusy: boolean;
}

function MemberRow({
  member,
  canRenameMember,
  canRemoveMember,
  groupIsCloud,
  isRenaming,
  renameDraft,
  onRenameDraftChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onRemove,
  onClaimSeat,
  claimSeatBusy,
  styles,
  palette,
  keyboardAppearance,
  renameSaveBusy,
}: MemberRowProps) {
  if (isRenaming) {
    return (
      <View style={styles.renameBlock}>
        <Text style={styles.name}>Rename {member.displayName}</Text>
        <BottomSheetTextInput
          style={styles.renameInput}
          value={renameDraft}
          onChangeText={onRenameDraftChange}
          placeholder="Name"
          placeholderTextColor={palette.labelTertiary}
          keyboardAppearance={keyboardAppearance}
          autoFocus
        />
        <View style={styles.renameActions}>
          <GlassButton variant="secondary" onPress={onCancelRename} style={{ flex: 1 }}>
            <GlassButton.Label>Cancel</GlassButton.Label>
          </GlassButton>
          <GlassButton
            variant="primary"
            onPress={onSaveRename}
            style={{ flex: 1 }}
            isDisabled={renameSaveBusy}
          >
            <GlassButton.Label>{renameSaveBusy ? 'Saving…' : 'Save'}</GlassButton.Label>
          </GlassButton>
        </View>
      </View>
    );
  }

  const subtitle = memberSubtitle(member, groupIsCloud);
  const showClaimSeat =
    groupIsCloud &&
    member.isPlaceholder === true &&
    !member.isCurrentUser &&
    typeof onClaimSeat === 'function';

  return (
    <View style={styles.row}>
      <Avatar
        name={member.displayName}
        seed={member.id}
        size={40}
        imageUri={member.avatarUri}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {member.displayName}
        </Text>
        <Text style={styles.meta}>{subtitle}</Text>
        {showClaimSeat ? (
          <Pressable
            style={({ pressed }) => [
              styles.claimSeatPressable,
              pressed && !claimSeatBusy && { opacity: 0.7 },
            ]}
            onPress={() => onClaimSeat(member)}
            disabled={claimSeatBusy}
            accessibilityRole="button"
            accessibilityLabel={`Link your Debtly account to the seat "${member.displayName}"`}
          >
            <Text
              style={[
                styles.claimSeatText,
                claimSeatBusy ? styles.claimSeatTextDisabled : undefined,
              ]}
            >
              {claimSeatBusy ? 'Linking seat…' : 'This is my seat — link account'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {canRenameMember || canRemoveMember ? (
        <View style={styles.actions}>
          {canRenameMember ? (
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
              onPress={onStartRename}
              accessibilityRole="button"
              accessibilityLabel={`Rename ${member.displayName}`}
            >
              <Pencil size={18} color={palette.labelSecondary} />
            </Pressable>
          ) : null}
          {canRemoveMember ? (
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                styles.iconButtonDanger,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${member.displayName}`}
            >
              <Trash2 size={18} color={palette.negative} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const GroupMembersSheet = forwardRef<GroupMembersSheetHandle>(function GroupMembersSheet(_, ref) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createSheetStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const sheetRef = useRef<BottomSheetModal>(null);
  const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
  const groups = useGroupExpenseStore((s) => s.groups);
  const expenses = useGroupExpenseStore((s) => s.expenses);
  const activityLog = useGroupExpenseStore((s) => s.activityLog);
  const renameMember = useGroupExpenseStore((s) => s.renameMember);
  const removeMember = useGroupExpenseStore((s) => s.removeMember);

  const convexRenameMember = useMutation(api.splitGroups.renameMember);
  const convexRemoveMember = useMutation(api.splitGroups.removeMember);
  const convexClaimPlaceholderSeat = useMutation(api.splitGroups.claimPlaceholderSeat);

  const { toast } = useToast();

  const { busy: renameSaveBusy, runGuarded } = useSubmitGuard();
  const { busy: claimSeatBusy, runGuarded: runClaimGuarded } = useSubmitGuard();

  const { scrollY, onScroll, resetScrollY } = useSheetSurfaceScrollFade();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const members = useMemo(() => (group ? sortMembers(group.members) : []), [group]);
  const viewerMemberId = group?.members.find((m) => m.isCurrentUser)?.id;
  const isGroupHost = Boolean(group && isViewerGroupHost(group, activityLog, viewerMemberId));
  const groupIsCloud = Boolean(group && isCloudSplitGroup(group));
  const viewerMember = group?.members.find((m) => m.isCurrentUser);
  /** Cloud groups only: viewer may merge into a placeholder row if they joined as their own duplicate seat. */
  const canOfferClaimSeat =
    groupIsCloud &&
    Boolean(viewerMember) &&
    viewerMember != null &&
    viewerMember.isPlaceholder !== true;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      present: (gid) => {
        resetScrollY();
        setGroupId(gid);
        setRenamingId(null);
        setRenameDraft('');
        presentSheet(() => sheetRef.current?.present());
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }),
    [presentSheet, resetScrollY]
  );

  const confirmRemove = (member: GroupMember) => {
    if (!groupId) return;
    const hasExpenses = expenses.some(
      (e) =>
        e.groupId === groupId &&
        !e.deletedAt &&
        (e.paidByMemberId === member.id || e.includedMemberIds.includes(member.id))
    );

    Alert.alert(
      `Remove ${member.displayName}?`,
      hasExpenses
        ? 'They will be removed from future splits. Past expenses stay in the activity log.'
        : 'This person will be removed from the group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (group && isCloudSplitGroup(group)) {
                try {
                  await convexRemoveMember({
                    groupId: groupId as Id<'splitGroups'>,
                    memberId: member.id,
                  });
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  notifySuccess(toast, 'Member removed');
                  if (renamingId === member.id) {
                    setRenamingId(null);
                    setRenameDraft('');
                  }
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Could not remove member.';
                  Alert.alert('Could not remove', msg);
                }
                return;
              }
              const rmErr = removeMember(groupId, member.id);
              if (rmErr) {
                Alert.alert('Could not remove', rmErr);
                return;
              }
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              notifySuccess(toast, 'Member removed');
              if (renamingId === member.id) {
                setRenamingId(null);
                setRenameDraft('');
              }
            })();
          },
        },
      ]
    );
  };

  const startRename = (member: GroupMember) => {
    setRenamingId(member.id);
    setRenameDraft(member.displayName);
  };

  const executeClaimSeat = (placeholderMember: GroupMember) =>
    void runClaimGuarded(async () => {
      if (!groupId || !group) return;
      if (!groupIsCloud) return;
      try {
        await convexClaimPlaceholderSeat({
          groupId: groupId as Id<'splitGroups'>,
          placeholderMemberId: placeholderMember.id,
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notifySuccess(toast, 'Seat linked');
        setRenamingId(null);
        setRenameDraft('');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not link this seat.';
        Alert.alert('Could not link seat', msg);
      }
    });

  const promptClaimSeat = (placeholderMember: GroupMember) => {
    Alert.alert(
      'Use this seat for your account?',
      `Splits and balances for "${placeholderMember.displayName}" will move onto your Debtly member. Your other member row will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Link here',
          onPress: () => executeClaimSeat(placeholderMember),
        },
      ]
    );
  };

  const saveRename = () =>
    void runGuarded(async () => {
      if (!groupId || !renamingId || !group) return;
      if (isCloudSplitGroup(group)) {
        try {
          await convexRenameMember({
            groupId: groupId as Id<'splitGroups'>,
            memberId: renamingId,
            displayName: renameDraft,
          });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          notifySuccess(toast, 'Name updated');
          setRenamingId(null);
          setRenameDraft('');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Could not rename.';
          Alert.alert('Could not rename', msg);
        }
        return;
      }
      const err = renameMember(groupId, renamingId, renameDraft);
      if (err) {
        Alert.alert('Could not rename', err);
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notifySuccess(toast, 'Name updated');
      setRenamingId(null);
      setRenameDraft('');
    });

  if (!group) return null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
      containerComponent={containerComponent}
      onDismiss={() => {
        resetScrollY();
        setRenamingId(null);
        setRenameDraft('');
      }}
    >
      <HeroUINativeProvider>
        <View style={styles.sheetBody}>
          <AnimatedBottomSheetScrollView
            style={scrollContentLayerStyle}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: MEMBERS_HEADER_SCROLL_PADDING_TOP,
                paddingBottom: contentBottomPadding,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {members.map((member, index) => (
              <View key={member.id}>
                <MemberRow
                  member={member}
                  canRenameMember={
                    isGroupHost && !member.isCurrentUser && member.isPlaceholder !== false
                  }
                  canRemoveMember={isGroupHost && !member.isCurrentUser}
                  groupIsCloud={groupIsCloud}
                  isRenaming={renamingId === member.id}
                  renameDraft={renameDraft}
                  onRenameDraftChange={setRenameDraft}
                  onStartRename={() => startRename(member)}
                  onSaveRename={saveRename}
                  onCancelRename={() => {
                    setRenamingId(null);
                    setRenameDraft('');
                  }}
                  onRemove={() => confirmRemove(member)}
                  onClaimSeat={canOfferClaimSeat ? promptClaimSeat : undefined}
                  claimSeatBusy={claimSeatBusy}
                  styles={styles}
                  palette={palette}
                  keyboardAppearance={keyboardAppearance}
                  renameSaveBusy={renameSaveBusy}
                />
                {index < members.length - 1 &&
                renamingId !== member.id &&
                renamingId !== members[index + 1]?.id ? (
                  <ListDivider />
                ) : null}
              </View>
            ))}
          </AnimatedBottomSheetScrollView>

          <SheetSurfaceScrollFadeStrip
            scrollY={scrollY}
            surfaceHex={palette.surface}
            height={MEMBERS_SHEET_SCROLL_FADE_HEIGHT}
          />

          <View
            style={[styles.headerOverlay, screenHeaderLayerStyle]}
            pointerEvents="box-none"
            collapsable={false}
          >
            <Text style={styles.title}>Members</Text>
            <Text style={styles.subtitle}>
              {members.length} {members.length === 1 ? 'person' : 'people'} in this group
            </Text>
          </View>
        </View>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});
