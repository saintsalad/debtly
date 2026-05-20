import type { Id } from '@/convex/_generated/dataModel';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useConvexAuth, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { Copy, RefreshCw } from 'lucide-react-native';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { sansForWeight } from '@/lib/appFonts';
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[4],
    },
    qrBox: {
      padding: space[2],
      borderRadius: 14,
      backgroundColor: palette.fill,
    },
    inviteCodeColumn: {
      flex: 1,
      justifyContent: 'center',
      minWidth: 0,
      gap: space[1],
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      minHeight: Platform.OS === 'android' ? 36 : undefined,
    },
    codeTextOuter: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    code: {
      ...type.title2,
      fontWeight: '700',
      fontFamily: sansForWeight('700'),
      color: palette.label,
      textAlign: 'left',
    },
    copyCodeButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: palette.fill,
    },
    codeWideSpacing: {
      letterSpacing: 3,
    },
    codeCompactSpacing: {
      letterSpacing: 1,
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

  const [groupId, setGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const { toast } = useToast();
  const { busy: addMemberBusy, runGuarded } = useSubmitGuard();
  const { busy: refreshingInvite, runGuarded: runRefreshGuarded } = useSubmitGuard();

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const isCloud = group?.syncMode === 'convex';
  const viewerMemberId = group?.members.find((m) => m.isCurrentUser)?.id;
  const isViewerHost = Boolean(
    group && isViewerGroupHost(group, activityLog, viewerMemberId)
  );
  const inviteLink = group ? getInviteLink(group.id) : '';
  const codeStyleWide = group && group.inviteCode.length <= 8;

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

  const handleCopyCode = async () => {
    if (!group || inviteRequiresConvexAuth) return;
    const ok = await copyStringToClipboard(group.inviteCode);
    if (ok) notifySuccess(toast, 'Invite code copied');
    else Alert.alert('Clipboard', 'Could not copy the code.');
  };

  const handleCopyLink = async () => {
    if (!group || inviteRequiresConvexAuth) return;
    const ok = await copyStringToClipboard(inviteLink);
    if (ok) notifySuccess(toast, 'Invite link copied');
    else Alert.alert('Clipboard', 'Could not copy the link.');
  };

  const handleShareLink = () => {
    if (!group || inviteRequiresConvexAuth) return;
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
        notifySuccess(toast, 'Invite refreshed', 'Share the new code or QR.');
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
    notifySuccess(toast, 'Invite refreshed', 'Share the new code or QR.');
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
      'The current code and QR will stop working. Share the new ones with anyone who still needs to join.',
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
              <View style={styles.inviteHero} accessibilityLabel="Invite code and QR">
                <View style={styles.qrBox}>
                  <QRCode
                    key={group.inviteCode}
                    value={inviteLink}
                    size={112}
                    color={palette.label}
                    backgroundColor="transparent"
                  />
                </View>
                <View style={styles.inviteCodeColumn}>
                  <View style={styles.codeRow}>
                    <View style={styles.codeTextOuter}>
                      <Text
                        style={[
                          styles.code,
                          codeStyleWide ? styles.codeWideSpacing : styles.codeCompactSpacing,
                        ]}
                        {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                        selectable
                        numberOfLines={1}
                        maxFontSizeMultiplier={codeStyleWide ? 1.25 : 1.12}
                        ellipsizeMode="middle"
                      >
                        {group.inviteCode}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Copy invite code"
                      onPress={() => void handleCopyCode()}
                      style={({ pressed }) => [
                        styles.copyCodeButton,
                        pressed && { opacity: 0.76 },
                      ]}
                      hitSlop={6}
                    >
                      <Copy size={22} color={palette.labelSecondary} />
                    </Pressable>
                  </View>
                  <Text style={styles.hint}>Scan QR or tap Share link.</Text>
                  {isViewerHost ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Refresh invite code and QR"
                      onPress={handleRefreshInvite}
                      disabled={refreshingInvite}
                      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: space[1], opacity: pressed ? 0.7 : 1 }]}
                    >
                      <RefreshCw size={14} color={palette.tint} />
                      <Text style={{ ...type.footnote, color: palette.tint, fontWeight: '600' }}>
                        {refreshingInvite ? 'Refreshing…' : 'New code & QR'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <GlassButton variant="primary" onPress={handleShareLink}>
                <GlassButton.Label>Share link</GlassButton.Label>
              </GlassButton>

              <GlassButton variant="secondary" onPress={() => void handleCopyLink()}>
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
