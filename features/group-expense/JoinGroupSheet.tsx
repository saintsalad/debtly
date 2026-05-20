import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { useConvexAuth } from 'convex/react';

import { GlassButton } from '@/components/ui/GlassButton';
import { api } from '@/convex/_generated/api';
import { ConvexAccountPromptCard } from '@/features/group-expense/ConvexAccountPromptCard';
import { joinSplitGroupFromInvite } from '@/features/group-expense/joinSplitGroupFlow';
import { parseInviteCodeFromLinkOrRaw } from '@/features/group-expense/joinLinkParse';
import { useAppBottomSheetLayout } from '@/lib/appBottomSheet';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { notifySuccess } from '@/lib/appToast';
import { isConvexConfigured } from '@/lib/convex/env';
import { useColors, space, type, type ColorPalette } from '@/lib/platform';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { useProfileStore } from '@/stores/profileStore';

const JOIN_FAIL_TITLE = 'Could not join';

export interface JoinGroupSheetHandle {
  present: () => void;
  dismiss: () => void;
}

function barcodePayload(event: unknown): string | undefined {
  if (!event || typeof event !== 'object') return undefined;
  const e = event as Record<string, unknown>;
  if (typeof e.data === 'string') return e.data;
  const ne = e.nativeEvent as Record<string, unknown> | undefined;
  if (ne && typeof ne.data === 'string') return ne.data;
  return undefined;
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
    modeRow: {
      flexDirection: 'row',
      gap: space[2],
    },
    modeChip: {
      flex: 1,
      paddingVertical: space[3],
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: palette.fill,
    },
    modeChipActive: {
      backgroundColor: palette.tintMuted ?? palette.fill,
    },
    modeChipLabel: {
      ...type.subheadline,
      fontWeight: '600',
      color: palette.labelSecondary,
    },
    modeChipLabelActive: {
      color: palette.label,
    },
    cameraWrap: {
      height: 260,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: palette.fill,
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraFrame: {
      width: 200,
      height: 200,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: palette.label,
    },
    authChecking: {
      paddingVertical: space[10],
      alignItems: 'center',
      gap: space[3],
    },
  });
}

interface JoinGroupSheetInnerProps {
  router: ReturnType<typeof useRouter>;
  accountGateConvex: boolean;
  convexAuthenticated: boolean;
  convexAuthLoading: boolean;
}

const JoinGroupSheetInner = forwardRef<JoinGroupSheetHandle, JoinGroupSheetInnerProps>(
  function JoinGroupSheetInner({ router, accountGateConvex, convexAuthenticated, convexAuthLoading }, ref) {
    const palette = useColors();
    const colorScheme = useAppColorScheme();
    const styles = useMemo(() => createSheetStyles(palette), [palette]);
    const keyboardAppearance = colorScheme === 'dark' ? 'dark' : 'light';
    const sheetRef = useRef<BottomSheetModal>(null);
    const { contentBottomPadding, containerComponent, presentSheet } = useAppBottomSheetLayout();
    const joinGroupByCode = useGroupExpenseStore((s) => s.joinGroupByCode);
    const profileName = useProfileStore((s) => s.name);
    const joinConvexMutation = useMutation(api.splitGroups.joinByInviteCode);
    const [permission, requestPermission] = useCameraPermissions();

    const [mode, setMode] = useState<'manual' | 'scan'>('manual');
    const [manualCode, setManualCode] = useState('');
    const [busy, setBusy] = useState(false);
    const scanPausedRef = useRef(false);
    const { toast } = useToast();

    const convexConfigured = isConvexConfigured();
    const preferConvex =
      convexConfigured && convexAuthenticated && !convexAuthLoading;
    const gatedJoinUx = convexConfigured && accountGateConvex;

    const openSignInFromJoinSheet = useCallback(() => {
      router.push({ pathname: '/create-account', params: { returnTo: 'join-sheet' } });
      sheetRef.current?.dismiss();
    }, [router]);

    const canScan = Platform.OS !== 'web';

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} pressBehavior="close" />
      ),
      []
    );

    useImperativeHandle(ref, () => ({
      present: () => {
        setMode('manual');
        setManualCode('');
        scanPausedRef.current = false;
        presentSheet(() => sheetRef.current?.present());
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    useEffect(() => {
      if (mode === 'scan' && canScan && permission && !permission.granted && permission.canAskAgain) {
        void requestPermission();
      }
    }, [mode, canScan, permission, requestPermission]);

    const navigateAfterJoin = useCallback(
      (groupId: string) => {
        notifySuccess(toast, 'Joined group');
        sheetRef.current?.dismiss();
        router.push({ pathname: '/group/[id]', params: { id: groupId } });
      },
      [router, toast]
    );

    const runJoin = useCallback(
      async (rawCodeOrLink: string) => {
        if (busy) return;

        setBusy(true);
        try {
          const displayName = profileName.trim() || 'You';
          const code = parseInviteCodeFromLinkOrRaw(rawCodeOrLink);
          if (!code) {
            Alert.alert(JOIN_FAIL_TITLE, 'Paste a valid invite link or code.');
            return;
          }

          if (!preferConvex) {
            const localId = joinGroupByCode(code, displayName);
            if (localId) {
              navigateAfterJoin(localId);
              return;
            }
            if (accountGateConvex && convexConfigured) {
              Alert.alert(
                JOIN_FAIL_TITLE,
                'Synced groups require a Debtly account. Open Join group again after signing in.'
              );
              return;
            }
            Alert.alert(
              JOIN_FAIL_TITLE,
              'No group on this device matched that invite. Check the code and try again.'
            );
            return;
          }

          const joined = await joinSplitGroupFromInvite({
            rawCodeOrLink,
            displayName,
            preferConvex: true,
            convexJoin: (c) => joinConvexMutation({ code: c }),
            localJoin: joinGroupByCode,
          });

          if (joined) {
            navigateAfterJoin(joined.groupId);
          } else {
            Alert.alert(
              JOIN_FAIL_TITLE,
              'Check the invite code or link. Offline groups may need the shorter on-device code.'
            );
          }
        } finally {
          setBusy(false);
        }
      },
      [
        accountGateConvex,
        busy,
        convexConfigured,
        joinConvexMutation,
        joinGroupByCode,
        navigateAfterJoin,
        preferConvex,
        profileName,
        router,
      ]
    );

    const onSubmitManual = useCallback(() => {
      void runJoin(manualCode);
    }, [manualCode, runJoin]);

    const onBarcodeScanned = useCallback(
      (event: unknown) => {
        if (busy || scanPausedRef.current) return;
        const data = barcodePayload(event);
        if (!data?.trim()) return;
        scanPausedRef.current = true;
        void (async () => {
          await runJoin(data);
          scanPausedRef.current = false;
        })();
      },
      [busy, runJoin]
    );

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
            <Text style={styles.title}>Join group</Text>
          </View>
          <BottomSheetScrollView
            contentContainerStyle={[styles.form, { paddingBottom: contentBottomPadding }]}
            keyboardShouldPersistTaps="handled"
          >
            {gatedJoinUx && convexAuthLoading ? (
              <View style={styles.authChecking}>
                <ActivityIndicator accessibilityLabel="Checking session" color={palette.tint} />
                <Text style={{ ...type.footnote, color: palette.labelSecondary, textAlign: 'center' }}>
                  Checking your session…
                </Text>
              </View>
            ) : gatedJoinUx && !convexAuthenticated ? (
              <ConvexAccountPromptCard
                variant="join"
                onContinueToSignIn={openSignInFromJoinSheet}
              />
            ) : (
              <>
                <Description>
                  Enter an invite code or scan a QR code for this device.
                </Description>

                {canScan ? (
              <View style={styles.modeRow}>
                <Pressable
                  style={[styles.modeChip, mode === 'manual' && styles.modeChipActive]}
                  onPress={() => setMode('manual')}
                >
                  <Text style={[styles.modeChipLabel, mode === 'manual' && styles.modeChipLabelActive]}>
                    Enter code
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modeChip, mode === 'scan' && styles.modeChipActive]}
                  onPress={() => setMode('scan')}
                >
                  <Text style={[styles.modeChipLabel, mode === 'scan' && styles.modeChipLabelActive]}>
                    Scan QR
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {mode === 'manual' || !canScan ? (
              <>
                <TextField>
                  <Label>Invite code or link</Label>
                  <BottomSheetTextInput
                    style={styles.input}
                    value={manualCode}
                    onChangeText={setManualCode}
                    placeholder="Paste link or code"
                    placeholderTextColor={palette.labelTertiary}
                    keyboardAppearance={keyboardAppearance}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </TextField>
                <GlassButton variant="primary" onPress={onSubmitManual} isDisabled={busy}>
                  <GlassButton.Label>{busy ? 'Joining…' : 'Join group'}</GlassButton.Label>
                </GlassButton>
              </>
            ) : (
              <>
                {!permission?.granted ? (
                  <View style={{ gap: space[3], alignItems: 'center', paddingVertical: space[4] }}>
                    <Text style={{ ...type.body, color: palette.labelSecondary, textAlign: 'center' }}>
                      Camera access is needed to scan QR invites.
                    </Text>
                    <GlassButton variant="secondary" onPress={() => void requestPermission()}>
                      <GlassButton.Label>Allow camera</GlassButton.Label>
                    </GlassButton>
                  </View>
                ) : (
                  <View style={styles.cameraWrap}>
                    <CameraView
                      style={styles.camera}
                      facing="back"
                      barcodeScannerEnabled
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={onBarcodeScanned}
                    />
                    <View style={styles.cameraOverlay} pointerEvents="none">
                      <View style={styles.cameraFrame} />
                    </View>
                  </View>
                )}
                {busy ? (
                  <View style={{ alignItems: 'center', paddingVertical: space[2] }}>
                    <ActivityIndicator />
                  </View>
                ) : null}
              </>
            )}

              </>
            )}
          </BottomSheetScrollView>
        </HeroUINativeProvider>
      </BottomSheetModal>
    );
  }
);

const JoinGroupSheetWithConvexGate = forwardRef<JoinGroupSheetHandle>((_, ref) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <JoinGroupSheetInner
      ref={ref}
      router={router}
      accountGateConvex
      convexAuthenticated={!isLoading && isAuthenticated}
      convexAuthLoading={isLoading}
    />
  );
});

export const JoinGroupSheet = forwardRef<JoinGroupSheetHandle>(function JoinGroupSheet(_, ref) {
  const router = useRouter();
  if (!isConvexConfigured()) {
    return (
      <JoinGroupSheetInner
        ref={ref}
        router={router}
        accountGateConvex={false}
        convexAuthenticated={false}
        convexAuthLoading={false}
      />
    );
  }
  return <JoinGroupSheetWithConvexGate ref={ref} />;
});
