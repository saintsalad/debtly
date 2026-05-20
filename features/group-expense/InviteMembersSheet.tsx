import type { Id } from '@/convex/_generated/dataModel';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { RefreshCw } from 'lucide-react-native';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { GlassButton } from '@/components/ui/GlassButton';
import { api } from '@/convex/_generated/api';
import { isViewerGroupHost } from '@/features/group-expense/activityLog';
import { ConvexAccountPromptCard } from '@/features/group-expense/ConvexAccountPromptCard';
import {
  copyStringToClipboard,
  shareInviteLinkMessage,
} from '@/features/group-expense/groupExpenseActions';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useSubmitGuard } from '@/hooks/use-submit-guard';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { notifyError, notifySuccess } from '@/lib/appToast';
import { isConvexConfigured } from '@/lib/convex/env';
import { space, type, useColors, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';

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
      paddingBottom: space[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.opaqueSeparator,
    },
    title: { ...type.headline, fontWeight: '600', color: palette.label },
    form: {
      gap: space[3],
      paddingHorizontal: space[5],
      paddingTop: space[3],
    },
    input: {
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: 14,
      backgroundColor: palette.fill,
      color: palette.label,
      fontSize: 17,
    },
    inviteHero: {
      alignItems: 'center',
      gap: space[2],
    },
    qrBox: {
      padding: space[2],
      borderRadius: 14,
      backgroundColor: palette.fill,
    },
    inviteActions: {
      alignItems: 'center',
      gap: space[1],
    },
    hint: {
      ...type.footnote,
      color: palette.labelSecondary,
    },
    memberDivider: {
      height: StyleSheet.hairlineWidth,
      marginTop: space[1],
      marginBottom: space[1],
      backgroundColor: palette.opaqueSeparator,
    },
    authChecking: {
      paddingVertical: space[10],
      alignItems: 'center',
      gap: space[3],
    },
  });
}

interface InviteMembersSheetInnerProps {
  router: ReturnType<typeof useRouter>;
  /** When Convex is enabled, invite actions that hit the server require Convex Auth first. */
  accountGateConvex: boolean;
  authReadyForShare: boolean;
  /** Convex Auth is still loading the session; avoid flashing the gate for returning users */
  convexAuthLoading: boolean;
}

const InviteMembersSheetInner = forwardRef<
  InviteMembersSheetHandle,
  InviteMembersSheetInnerProps
>(function InviteMembersSheetInner(
  { router, accountGateConvex, authReadyForShare, convexAuthLoading },
  ref
) {
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const styles = useMemo(() => createSheetStyles(palette), [palette]);
  const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
  const sheetRef = useRef<BottomSheetModal>(null);
  const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
  const addMember = useGroupExpenseStore((s) => s.addMember);
  const getInviteLink = useGroupExpenseStore((s) => s.getInviteLink);
  const setGroupInviteCode = useGroupExpenseStore((s) => s.setGroupInviteCode);
  const regenerateLocalInviteCode = useGroupExpenseStore((s) => s.regenerateLocalInviteCode);
  const groups = useGroupExpenseStore((s) => s.groups);
  const activityLog = useGroupExpenseStore((s) => s.activityLog);

  const addPlaceholderConvex = useMutation(api.splitGroups.addPlaceholderMember);
  const regenerateInviteConvex = useMutation(api.splitGroups.regenerateInvite);
  const ensureGroupInviteConvex = useMutation(api.splitGroups.ensureGroupInvite);

  const [groupId, setGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const { toast } = useToast();
  const { busy: addMemberBusy, runGuarded } = useSubmitGuard();
  const { busy: refreshingInvite, runGuarded: runRefreshGuarded } = useSubmitGuard();

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const isCloud = group?.syncMode === 'convex';
  const serverInvite = useQuery(
    api.splitGroups.getGroupInvite,
    isCloud && groupId && authReadyForShare
      ? { groupId: groupId as Id<'splitGroups'> }
      : 'skip'
  );
  const viewerMemberId = group?.members.find((m) => m.isCurrentUser)?.id;
  const isViewerHost = Boolean(
    group && isViewerGroupHost(group, activityLog, viewerMemberId)
  );
  /** Cloud groups: only show invite from Convex, never stale SQLite/Zustand codes. */
  const displayInviteCode = isCloud
    ? serverInvite === undefined
      ? ''
      : (serverInvite.inviteCode ?? '')
    : (group?.inviteCode ?? '');
  const inviteLink = group
    ? displayInviteCode
      ? `debtly://group/join?code=${displayInviteCode}`
      : getInviteLink(group.id)
    : '';
  const inviteCodeLoading = isCloud && authReadyForShare && serverInvite === undefined;

  const inviteConvexSessionLoading = Boolean(accountGateConvex && convexAuthLoading);
  /** Convex configured + unsigned: hide QR / link unless signed in */
  const inviteRequiresConvexAuth = Boolean(
    accountGateConvex && !authReadyForShare && !convexAuthLoading
  );

  /** Host-only: placeholders for local-only groups stay available without Convex auth */
  const showPlaceholderFormForHost =
    isViewerHost && !convexAuthLoading && (!isCloud || authReadyForShare);

  const openCreateAccountFlow = useCallback(() => {
    const params =
      typeof groupId === 'string'
        ? { returnTo: 'invite-sheet', groupId }
        : { returnTo: 'invite-sheet' };
    router.push({ pathname: '/create-account', params });
    sheetRef.current?.dismiss();
  }, [groupId, router]);

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

  useEffect(() => {
    if (!isCloud || !groupId || !authReadyForShare || serverInvite === undefined) return;
    const serverCode = serverInvite?.inviteCode?.trim().toUpperCase();
    if (serverCode && group && serverCode !== group.inviteCode) {
      setGroupInviteCode(groupId, serverCode);
      return;
    }
    if (serverCode || !isViewerHost) return;
    void ensureGroupInviteConvex({ groupId: groupId as Id<'splitGroups'> })
      .then(({ inviteCode }) => setGroupInviteCode(groupId, inviteCode))
      .catch(() => {
        /* Host can use "New QR & link" if backfill fails. */
      });
  }, [
    authReadyForShare,
    ensureGroupInviteConvex,
    group,
    groupId,
    isCloud,
    isViewerHost,
    serverInvite,
    setGroupInviteCode,
  ]);

  const handleCopyLink = async () => {
    if (!group || inviteRequiresConvexAuth || inviteCodeLoading || !displayInviteCode) return;
    const ok = await copyStringToClipboard(inviteLink);
    if (ok) notifySuccess(toast, 'Invite link copied');
    else Alert.alert('Clipboard', 'Could not copy the link.');
  };

  const handleShareLink = () => {
    if (!group || inviteRequiresConvexAuth || inviteCodeLoading || !displayInviteCode) return;
    void shareInviteLinkMessage(inviteLink);
  };

  const runRefreshInvite = useCallback(async () => {
    if (!groupId || !group) return;
    if (!isViewerHost) {
      Alert.alert('Host only', 'Only the group host can refresh the invite code.');
      return;
    }
    if (!authReadyForShare && accountGateConvex) {
      return;
    }
    if (isCloud) {
      try {
        const { inviteCode: nextCode } = await regenerateInviteConvex({
          groupId: groupId as Id<'splitGroups'>,
        });
        setGroupInviteCode(groupId, nextCode);
        notifySuccess(toast, 'Invite refreshed', 'Share the new QR or link.');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not refresh invite.';
        notifyError(toast, 'Refresh failed', msg);
      }
      return;
    }
    const err = regenerateLocalInviteCode(groupId);
    if (err) {
      Alert.alert('Could not refresh', err);
      return;
    }
    notifySuccess(toast, 'Invite refreshed', 'Share the new QR or link.');
  }, [
    accountGateConvex,
    authReadyForShare,
    group,
    groupId,
    isCloud,
    isViewerHost,
    regenerateInviteConvex,
    regenerateLocalInviteCode,
    setGroupInviteCode,
    toast,
  ]);

  const handleRefreshInvite = useCallback(() => {
    Alert.alert(
      'Refresh invite?',
      'The current QR and link will stop working. Share the new ones with anyone who still needs to join.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: () => void runRefreshGuarded(runRefreshInvite),
        },
      ]
    );
  }, [runRefreshGuarded, runRefreshInvite]);

  const submitAddMember = async () => {
    if (!groupId || !name.trim()) {
      Alert.alert('Name required', 'Enter a name to add.');
      return;
    }
    if (!group) return;

    const vid = group.members.find((m) => m.isCurrentUser)?.id;
    if (!isViewerGroupHost(group, activityLog, vid)) {
      Alert.alert('Host only', 'Only the group host can add name-only members.');
      return;
    }

    if (group?.syncMode === 'convex') {
      if (!authReadyForShare || convexAuthLoading) return;
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

  const handleAdd = () => void runGuarded(submitAddMember);

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
          {inviteConvexSessionLoading ? (
            <View style={styles.authChecking}>
              <ActivityIndicator accessibilityLabel="Checking session" color={palette.tint} />
              <Text style={styles.hint}>Checking your session…</Text>
            </View>
          ) : inviteRequiresConvexAuth ? (
            <>
              <ConvexAccountPromptCard
                variant={isViewerHost ? 'invite-host' : 'invite-member'}
                onContinueToSignIn={openCreateAccountFlow}
                footerNote={
                  showPlaceholderFormForHost && !isCloud ? 'Placeholders below (on-device).' : undefined
                }
              />
              {showPlaceholderFormForHost ? (
                <>
                  <View style={styles.memberDivider} />
                  <TextField>
                    <Label>Placeholder name</Label>
                    <Description>Add someone not on Debtly yet—they can claim the seat later.</Description>
                    <BottomSheetTextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Alex, Mia…"
                      placeholderTextColor={palette.labelTertiary}
                      keyboardAppearance={keyboardAppearance}
                    />
                  </TextField>
                  <GlassButton variant="primary" onPress={handleAdd} isDisabled={addMemberBusy}>
                    <GlassButton.Label>{addMemberBusy ? 'Adding…' : 'Add member'}</GlassButton.Label>
                  </GlassButton>
                </>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.inviteHero} accessibilityLabel="Invite QR code">
                <View style={styles.qrBox}>
                  {inviteCodeLoading || !displayInviteCode ? (
                    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color={palette.tint} />
                    </View>
                  ) : (
                    <QRCode
                      key={displayInviteCode}
                      value={inviteLink}
                      size={160}
                      color={palette.label}
                      backgroundColor="transparent"
                    />
                  )}
                </View>
                <View style={styles.inviteActions}>
                  <Text style={[styles.hint, { textAlign: 'center' }]}>Scan the QR or share the link.</Text>
                  {isViewerHost ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Refresh invite QR and link"
                      onPress={handleRefreshInvite}
                      disabled={refreshingInvite}
                      style={({ pressed }) => [
                        { flexDirection: 'row', alignItems: 'center', gap: space[1], opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <RefreshCw size={14} color={palette.tint} />
                      <Text style={{ ...type.footnote, color: palette.tint, fontWeight: '600' }}>
                        {refreshingInvite ? 'Refreshing…' : 'New QR & link'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <GlassButton
                variant="primary"
                onPress={handleShareLink}
                isDisabled={inviteCodeLoading || !displayInviteCode}
              >
                <GlassButton.Label>Share link</GlassButton.Label>
              </GlassButton>

              <GlassButton
                variant="secondary"
                onPress={() => void handleCopyLink()}
                isDisabled={inviteCodeLoading || !displayInviteCode}
              >
                <GlassButton.Label>Copy link</GlassButton.Label>
              </GlassButton>

              <View style={styles.memberDivider} />

              {isViewerHost ? (
                <>
                  <TextField>
                    <Label>Placeholder name</Label>
                    <Description>Add someone not on Debtly yet—they can claim the seat later.</Description>
                    <BottomSheetTextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Alex, Mia…"
                      placeholderTextColor={palette.labelTertiary}
                      keyboardAppearance={keyboardAppearance}
                    />
                  </TextField>
                  <GlassButton variant="primary" onPress={handleAdd} isDisabled={addMemberBusy}>
                    <GlassButton.Label>{addMemberBusy ? 'Adding…' : 'Add member'}</GlassButton.Label>
                  </GlassButton>
                </>
              ) : (
                <Text style={styles.hint}>
                  Only the host can add name-only members for people who are not on Debtly yet. Share the
                  invite link so they can join with their account.
                </Text>
              )}
            </>
          )}
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
      convexAuthLoading={isLoading}
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
        convexAuthLoading={false}
      />
    );
  }
  return <InviteMembersWithConvexGate ref={ref} />;
});
