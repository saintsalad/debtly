import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { useRouter } from 'expo-router';

import { GlassButton } from '@/components/ui/GlassButton';
import { copyInviteLink } from '@/features/group-expense/groupExpenseActions';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import { isConvexConfigured } from '@/lib/convex/env';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useConvexAuth } from 'convex/react';

export interface InviteMembersSheetHandle {
  present: (groupId: string) => void;
  dismiss: () => void;
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
    form: {
      gap: space[4],
      paddingHorizontal: space[5],
      paddingTop: space[4],
    },
    input: {
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: 14,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    code: {
      ...type.title2,
      fontWeight: '700',
      fontFamily: sansForWeight('700'),
      letterSpacing: 3,
      color: palette.label,
      textAlign: 'center',
    },
  });
}

interface InviteMembersSheetInnerProps {
  router: ReturnType<typeof useRouter>;
  /** When Convex is enabled, copying/sharing invite requires Convex Auth first. */
  accountGateConvex: boolean;
  authReadyForShare: boolean;
}

const InviteMembersSheetInner = forwardRef<
  InviteMembersSheetHandle,
  InviteMembersSheetInnerProps
>(function InviteMembersSheetInner({ router, accountGateConvex, authReadyForShare }, ref) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createSheetStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const sheetRef = useRef<BottomSheetModal>(null);
  const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
  const addMember = useGroupExpenseStore((s) => s.addMember);
  const getInviteLink = useGroupExpenseStore((s) => s.getInviteLink);
  const groups = useGroupExpenseStore((s) => s.groups);

  const [groupId, setGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const { toast } = useToast();

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  useImperativeHandle(ref, () => ({
    present: (gid) => {
      setGroupId(gid);
      setName('');
      presentSheet(() => sheetRef.current?.present());
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleAdd = () => {
    if (!groupId || !name.trim()) {
      Alert.alert('Name required', 'Enter a name to add.');
      return;
    }
    addMember(groupId, name.trim());
    notifySuccess(toast, 'Member added');
    setName('');
    sheetRef.current?.dismiss();
  };

  const handleShareInvite = () => {
    if (!group) return;
    if (accountGateConvex && !authReadyForShare) {
      router.push({
        pathname: '/create-account',
        params: { returnTo: 'invite-sheet' },
      });
      sheetRef.current?.dismiss();
      return;
    }
    void copyInviteLink(getInviteLink(group.id));
    notifySuccess(toast, 'Invite link copied');
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
    >
      <HeroUINativeProvider>
        <View style={styles.header}>
          <Text style={styles.title}>Invite</Text>
        </View>
        <BottomSheetScrollView
          contentContainerStyle={[styles.form, { paddingBottom: contentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.code}>{group.inviteCode}</Text>
          <Description>
            Share your invite link so others can open the group from their device when sync is enabled.
          </Description>
          <GlassButton variant="secondary" onPress={handleShareInvite}>
            <GlassButton.Label>Copy or share invite link</GlassButton.Label>
          </GlassButton>
          <TextField>
            <Label>Add by name</Label>
            <BottomSheetTextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Alex, Mia…"
              placeholderTextColor={palette.labelTertiary}
              keyboardAppearance={keyboardAppearance}
            />
          </TextField>
          <GlassButton variant="primary" onPress={handleAdd}>
            <GlassButton.Label>Add member</GlassButton.Label>
          </GlassButton>
        </BottomSheetScrollView>
      </HeroUINativeProvider>
    </BottomSheetModal>
  );
});

const InviteMembersWithConvexGate = forwardRef<InviteMembersSheetHandle>((_, ref) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <InviteMembersSheetInner
      ref={ref}
      router={router}
      accountGateConvex
      authReadyForShare={!isLoading && isAuthenticated}
    />
  );
});

export const InviteMembersSheet = forwardRef<InviteMembersSheetHandle>(function InviteMembersSheet(
  _props,
  ref
) {
  const router = useRouter();
  if (!isConvexConfigured()) {
    return (
      <InviteMembersSheetInner
        ref={ref}
        router={router}
        accountGateConvex={false}
        authReadyForShare
      />
    );
  }
  return <InviteMembersWithConvexGate ref={ref} />;
});
