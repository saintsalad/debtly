import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Pencil, Trash2 } from 'lucide-react-native';
import { HeroUINativeProvider } from 'heroui-native';
import { Avatar } from '@/components/ui/Avatar';
import { GlassButton } from '@/components/ui/GlassButton';
import { ListDivider } from '@/components/ui/ListDivider';
import type { GroupMember } from '@/features/group-expense/types';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';

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

function createSheetStyles(palette: ColorPalette) {
  return StyleSheet.create({
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: palette.surface,
    },
    handle: { width: 40, backgroundColor: palette.opaqueSeparator },
    header: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: { ...type.headline, fontWeight: '600', color: palette.label },
    subtitle: {
      ...type.footnote,
      color: palette.labelSecondary,
      marginTop: space[1],
    },
    content: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
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
  });
}

interface MemberRowProps {
  member: GroupMember;
  canManage: boolean;
  isRenaming: boolean;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onRemove: () => void;
  styles: ReturnType<typeof createSheetStyles>;
  palette: ColorPalette;
  keyboardAppearance: 'light' | 'dark';
}

function MemberRow({
  member,
  canManage,
  isRenaming,
  renameDraft,
  onRenameDraftChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onRemove,
  styles,
  palette,
  keyboardAppearance,
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
          <GlassButton variant="primary" onPress={onSaveRename} style={{ flex: 1 }}>
            <GlassButton.Label>Save</GlassButton.Label>
          </GlassButton>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Avatar name={member.displayName} size={40} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {member.displayName}
        </Text>
        <Text style={styles.meta}>
          {member.isCurrentUser ? 'You' : 'Named member · not signed in'}
        </Text>
      </View>
      {canManage ? (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
            onPress={onStartRename}
            accessibilityRole="button"
            accessibilityLabel={`Rename ${member.displayName}`}
          >
            <Pencil size={18} color={palette.labelSecondary} />
          </Pressable>
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
  const renameMember = useGroupExpenseStore((s) => s.renameMember);
  const removeMember = useGroupExpenseStore((s) => s.removeMember);

  const [groupId, setGroupId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const members = useMemo(() => (group ? sortMembers(group.members) : []), [group]);
  const isHost = Boolean(group?.members.some((m) => m.isCurrentUser));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  useImperativeHandle(ref, () => ({
    present: (gid) => {
      setGroupId(gid);
      setRenamingId(null);
      setRenameDraft('');
      presentSheet(() => sheetRef.current?.present());
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

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
            removeMember(groupId, member.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (renamingId === member.id) {
              setRenamingId(null);
              setRenameDraft('');
            }
          },
        },
      ]
    );
  };

  const startRename = (member: GroupMember) => {
    setRenamingId(member.id);
    setRenameDraft(member.displayName);
  };

  const saveRename = () => {
    if (!groupId || !renamingId) return;
    const err = renameMember(groupId, renamingId, renameDraft);
    if (err) {
      Alert.alert('Could not rename', err);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRenamingId(null);
    setRenameDraft('');
  };

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
        setRenamingId(null);
        setRenameDraft('');
      }}
    >
      <HeroUINativeProvider>
        <View style={styles.header}>
          <Text style={styles.title}>Members</Text>
          <Text style={styles.subtitle}>
            {members.length} {members.length === 1 ? 'person' : 'people'} in this group
          </Text>
        </View>
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          {members.map((member, index) => (
            <View key={member.id}>
              <MemberRow
                member={member}
                canManage={isHost && !member.isCurrentUser}
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
                styles={styles}
                palette={palette}
                keyboardAppearance={keyboardAppearance}
              />
              {index < members.length - 1 && renamingId !== member.id && renamingId !== members[index + 1]?.id ? (
                <ListDivider />
              ) : null}
            </View>
          ))}
        </BottomSheetScrollView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});
