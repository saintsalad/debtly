import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import QRCode from 'react-native-qrcode-svg';
import { Copy } from 'lucide-react-native';
import { useConvexAuth, useMutation } from 'convex/react';
import type { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'expo-router';

import { GlassButton } from '@/components/ui/GlassButton';
import {
  copyStringToClipboard,
  shareInviteLinkMessage,
} from '@/features/group-expense/groupExpenseActions';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useSubmitGuard } from '@/hooks/use-submit-guard';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { notifySuccess } from '@/lib/appToast';
import { sansForWeight } from '@/lib/appFonts';
import { isViewerGroupHost } from '@/features/group-expense/activityLog';
import { isConvexConfigured } from '@/lib/convex/env';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
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
  const activityLog = useGroupExpenseStore((s) => s.activityLog);

  const addPlaceholderConvex = useMutation(api.splitGroups.addPlaceholderMember);

  const [groupId, setGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const { toast } = useToast();
  const { busy: addMemberBusy, runGuarded } = useSubmitGuard();

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const isCloud = group?.syncMode === 'convex';
  const viewerMemberId = group?.members.find((m) => m.isCurrentUser)?.id;
  const isViewerHost = Boolean(
    group && isViewerGroupHost(group, activityLog, viewerMemberId)
  );
  const inviteLink = group ? getInviteLink(group.id) : '';
  const codeStyleWide = group && group.inviteCode.length <= 8;

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
          <View style={styles.inviteHero} accessibilityLabel="Invite code and QR">
            <View style={styles.qrBox}>
              <QRCode
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
                <Description>
                  Someone not on Debtly yet? Add their name here so bills can split to them—they can claim
                  the spot later with invite.
                </Description>
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
              Only the host can add name-only members for people who are not on Debtly yet. Share the invite
              link so they can join with their account.
            </Text>
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
