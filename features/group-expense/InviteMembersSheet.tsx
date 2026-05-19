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
import type { Id } from 'convex/values';
import QRCode from 'react-native-qrcode-svg';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';

import { GlassButton } from '@/components/ui/GlassButton';
import {
  copyStringToClipboard,
  shareInviteLinkMessage,
} from '@/features/group-expense/groupExpenseActions';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import { isConvexConfigured } from '@/lib/convex/env';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';

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
      color: palette.label,
      textAlign: 'center',
      flexWrap: 'wrap',
    },
    codeWideSpacing: {
      letterSpacing: 3,
    },
    codeCompactSpacing: {
      letterSpacing: 1,
    },
    qrWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[2],
      backgroundColor: palette.fill,
      borderRadius: 16,
    },
    actionsRow: {
      gap: space[2],
    },
  });
}

interface InviteMembersSheetInnerProps {
  router: ReturnType<typeof useRouter>;
  /** When Convex is enabled, invite actions that hit the server require Convex Auth first. */
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

  const addPlaceholderConvex = useMutation(api.splitGroups.addPlaceholderMember);
  const regenerateInvite = useMutation(api.splitGroups.regenerateInvite);

  const [groupId, setGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [regenerateBusy, setRegenerateBusy] = useState(false);
  const { toast } = useToast();

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const isCloud = group?.syncMode === 'convex';
  const inviteLink = group ? getInviteLink(group.id) : '';
  const codeStyleWide = group && group.inviteCode.length <= 12;

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

  const requireAuthForCloudActions = () => {
    if (!accountGateConvex || authReadyForShare) return false;
    router.push({
      pathname: '/create-account',
      params: { returnTo: 'invite-sheet' },
    });
    sheetRef.current?.dismiss();
    return true;
  };

  const handleCopyCode = async () => {
    if (!group) return;
    if (isCloud && requireAuthForCloudActions()) return;
    const ok = await copyStringToClipboard(group.inviteCode);
    if (ok) notifySuccess(toast, 'Invite code copied');
    else Alert.alert('Clipboard', 'Could not copy the code.');
  };

  const handleCopyLink = async () => {
    if (!group) return;
    if (isCloud && requireAuthForCloudActions()) return;
    const ok = await copyStringToClipboard(inviteLink);
    if (ok) notifySuccess(toast, 'Invite link copied');
    else Alert.alert('Clipboard', 'Could not copy the link.');
  };

  const handleShareLink = () => {
    if (!group) return;
    if (isCloud && requireAuthForCloudActions()) return;
    void shareInviteLinkMessage(inviteLink);
  };

  const handleRegenerateInvite = async () => {
    if (!group || !isCloud) return;
    if (requireAuthForCloudActions()) return;
    setRegenerateBusy(true);
    try {
      await regenerateInvite({ groupId: group.id as Id<'splitGroups'> });
      notifySuccess(toast, 'New invite code active', 'Share the updated QR or link with new guests.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not refresh invite.';
      Alert.alert('Invite', msg);
    } finally {
      setRegenerateBusy(false);
    }
  };

  const handleAdd = async () => {
    if (!groupId || !name.trim()) {
      Alert.alert('Name required', 'Enter a name to add.');
      return;
    }

    if (group?.syncMode === 'convex') {
      if (requireAuthForCloudActions()) return;
      try {
        await addPlaceholderConvex({
          groupId: groupId as Id<'splitGroups'>,
          displayName: name.trim(),
        });
        notifySuccess(toast, 'Member added');
        setName('');
        sheetRef.current?.dismiss();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not add member.';
        Alert.alert('Add member', msg);
      }
      return;
    }

    addMember(groupId, name.trim());
    notifySuccess(toast, 'Member added');
    setName('');
    sheetRef.current?.dismiss();
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
          <Text
            style={[
              styles.code,
              codeStyleWide ? styles.codeWideSpacing : styles.codeCompactSpacing,
            ]}
            selectable
          >
            {group.inviteCode}
          </Text>

          <View style={styles.qrWrap}>
            <QRCode
              value={inviteLink}
              size={180}
              color={palette.label}
              backgroundColor={palette.fill}
            />
          </View>

          <Description>
            Others can scan the QR or open the link on their phone. Cloud groups sync through your
            Debtly account—guests need to sign in when sync is enabled.
          </Description>

          <View style={styles.actionsRow}>
            <GlassButton variant="secondary" onPress={() => void handleCopyCode()}>
              <GlassButton.Label>Copy code</GlassButton.Label>
            </GlassButton>
            <GlassButton variant="secondary" onPress={() => void handleCopyLink()}>
              <GlassButton.Label>Copy link</GlassButton.Label>
            </GlassButton>
          </View>

          <GlassButton variant="secondary" onPress={handleShareLink}>
            <GlassButton.Label>Share link</GlassButton.Label>
          </GlassButton>

          {isCloud ? (
            <GlassButton
              variant="secondary"
              onPress={() => void handleRegenerateInvite()}
              disabled={regenerateBusy}
            >
              <GlassButton.Label>{regenerateBusy ? 'Refreshing…' : 'New invite code'}</GlassButton.Label>
            </GlassButton>
          ) : null}

          <TextField>
            <Label>Add placeholder by name</Label>
            <BottomSheetTextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Alex, Mia…"
              placeholderTextColor={palette.labelTertiary}
              keyboardAppearance={keyboardAppearance}
            />
          </TextField>
          <GlassButton variant="primary" onPress={() => void handleAdd()}>
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
