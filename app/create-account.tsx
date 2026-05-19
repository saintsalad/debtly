import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import * as Haptics from 'expo-haptics';

import { GlassButton } from '@/components/ui/GlassButton';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { Avatar } from '@/components/ui/Avatar';
import { ChevronLeft, X } from 'lucide-react-native';
import {
  isValidUsernameSlug,
  normalizeUsernameSlug,
  usernameToSyntheticEmail,
} from '@/lib/account/accountConstants';
import { notifySuccess } from '@/lib/appToast';
import { isConvexConfigured } from '@/lib/convex/env';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { layout, useColors, radius, space, type, type ColorPalette } from '@/lib/platform';
import { useAccountInviteStore } from '@/stores/accountInviteStore';
import { useAuthActions } from '@convex-dev/auth/react';
import { useProfileStore } from '@/stores/profileStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';
import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';

const PIN_LEN = 6;

/** PIN row hit target + invisible input overlay — Android IME needs direct touches on `TextInput`, not `Pressable`→`focus()`. */
const pinRowLayoutStyles = StyleSheet.create({
  shakeWrap: {
    marginVertical: space[6],
  },
  hitArea: {
    position: 'relative',
    minHeight: space[12],
    justifyContent: 'center',
  },
  cellsRow: {
    flexDirection: 'row',
    gap: space[2],
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});

// ─── PIN Cell ──────────────────────────────────────────────────────────────────

interface PinCellProps {
  filled: boolean;
  active: boolean;
  hasError: boolean;
  palette: ColorPalette;
}

function PinCell({ filled, active, hasError, palette }: PinCellProps) {
  const scale = useSharedValue(1);
  const prevFilled = useRef(filled);

  useEffect(() => {
    if (filled && !prevFilled.current) {
      scale.value = withSpring(
        1.06,
        { damping: 16, stiffness: 380 },
        () => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }
      );
    }
    prevFilled.current = filled;
  }, [filled, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isCurrent = active && !filled;

  const bg = hasError
    ? palette.negativeSoft
    : filled
      ? palette.tintMuted
      : isCurrent
        ? palette.fillSecondary
        : palette.fill;

  const borderColor = hasError
    ? palette.negative
    : isCurrent
      ? palette.tintMuted
      : palette.separator;

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          minWidth: 0,
          height: space[12],
          borderRadius: radius.md,
          backgroundColor: bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animStyle,
      ]}>
      {filled ? (
        <View
          style={{
            width: space[2],
            height: space[2],
            borderRadius: space[1],
            backgroundColor: hasError ? palette.negative : palette.tint,
          }}
        />
      ) : null}
    </Animated.View>
  );
}

// ─── PIN Row ───────────────────────────────────────────────────────────────────

interface PinRowProps {
  value: string;
  hasError: boolean;
  palette: ColorPalette;
  inputRef: React.RefObject<TextInput | null>;
  accessibilityHint?: string;
  /** Spread onto the overlay `TextInput` (must include value / onChangeText / keyboard props). */
  inputProps: Omit<TextInputProps, 'ref'>;
}

function PinRow({ value, hasError, palette, inputRef, accessibilityHint, inputProps }: PinRowProps) {
  const shakeX = useSharedValue(0);
  const prevError = useRef(false);

  useEffect(() => {
    if (hasError && !prevError.current) {
      shakeX.value = withSequence(
        withTiming(-space[3], { duration: 50 }),
        withRepeat(withTiming(space[3], { duration: 50 }), 5, true),
        withTiming(0, { duration: 50 })
      );
    }
    prevError.current = hasError;
  }, [hasError, shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View style={[pinRowLayoutStyles.shakeWrap, shakeStyle]}>
      <View style={pinRowLayoutStyles.hitArea} collapsable={false}>
        <View pointerEvents="none" style={pinRowLayoutStyles.cellsRow}>
          {Array.from({ length: PIN_LEN }, (_, i) => (
            <PinCell
              key={i}
              filled={i < value.length}
              active={i === value.length}
              hasError={hasError}
              palette={palette}
            />
          ))}
        </View>
        <TextInput
          ref={inputRef}
          {...inputProps}
          accessibilityLabel={accessibilityHint ?? inputProps.accessibilityLabel ?? 'PIN entry'}
          style={[pinRowLayoutStyles.overlayInput, inputProps.style]}
        />
      </View>
    </Animated.View>
  );
}

// ─── Step Dot (animated pill) ──────────────────────────────────────────────────

const STEP_DOT_ACTIVE_W = space[6];
const STEP_DOT_IDLE_W = space[2];

function StepDot({
  active,
  completed,
  palette,
}: {
  active: boolean;
  completed: boolean;
  palette: ColorPalette;
}) {
  const width = useSharedValue(active ? STEP_DOT_ACTIVE_W : STEP_DOT_IDLE_W);

  useEffect(() => {
    width.value = withTiming(active ? STEP_DOT_ACTIVE_W : STEP_DOT_IDLE_W, { duration: 280 });
  }, [active, width]);

  const animStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Animated.View
      style={[
        {
          height: space[1],
          borderRadius: radius.pill,
          backgroundColor: completed || active ? palette.tint : palette.fill,
          opacity: completed ? 0.45 : 1,
        },
        animStyle,
      ]}
    />
  );
}

function StepProgress({ step, palette }: { step: 0 | 1 | 2; palette: ColorPalette }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: space[2],
        marginBottom: space[5],
      }}>
      {([0, 1, 2] as const).map((i) => (
        <StepDot key={i} active={step === i} completed={step > i} palette={palette} />
      ))}
    </View>
  );
}

function createStyles(palette: ColorPalette, topPad: number) {
  const avatarDiameter = space[12] + space[6];

  return StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: topPad + space[4],
      paddingHorizontal: layout.screenPaddingX,
      backgroundColor: palette.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: space[4],
    },
    headerTitle: {
      ...(type.headline as object),
      color: palette.labelSecondary,
      flex: 1,
      textAlign: 'center',
    },
    headline: {
      ...(type.largeTitle as object),
      color: palette.label,
      marginBottom: space[2],
    },
    subcopy: {
      ...(type.subheadline as object),
      color: palette.labelSecondary,
      marginBottom: space[6],
    },
    fieldBlock: {
      gap: space[2],
      marginBottom: space[4],
    },
    inputFilled: {
      ...(type.body as object),
      color: palette.label,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: radius.md,
      backgroundColor: palette.fill,
      minHeight: 48,
    },
    avatarWrap: {
      alignSelf: 'center',
      marginBottom: space[6],
      alignItems: 'center',
    },
    avatarRing: {
      width: avatarDiameter,
      height: avatarDiameter,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.separator,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
    },
    errorCaption: {
      ...(type.caption1 as object),
      color: palette.negative,
      textAlign: 'center',
      marginTop: space[2],
      marginBottom: space[4],
    },
    spacer: { flexGrow: 1 },
    /** Bottom inset for CTAs — paired with `SafeAreaView` so Android edge-to-edge clears nav/gesture bar. */
    footerSafe: {
      backgroundColor: palette.bg,
    },
    footer: {
      gap: space[3],
      paddingTop: space[2],
      paddingBottom: space[4],
    },
    headerSide: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    usernameStatus: {
      ...(type.caption1 as object),
      marginTop: space[1],
    },
  });
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function CreateAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useColors();
  const colorScheme = useAppColorScheme();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { signIn } = useAuthActions();

  const presetName = useProfileStore((s) => s.name);
  const setName = useProfileStore((s) => s.setName);
  const setUsername = useProfileStore((s) => s.setUsername);
  const joinGroupByCode = useGroupExpenseStore((s) => s.joinGroupByCode);
  const syncViewerUsernameInGroups = useGroupExpenseStore((s) => s.syncViewerUsernameInGroups);
  const joinConvexGroup = useMutation(api.splitGroups.joinByInviteCode);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [displayName, setDisplayName] = useState(presetName === 'Friend' ? '' : presetName);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const pinInputRef = useRef<TextInput>(null);
  const confirmPinInputRef = useRef<TextInput>(null);
  /** After backing out of confirm PIN, `pin` may still be full length — skip auto-advance until they edit. */
  const suppressPinAutoAdvanceRef = useRef(false);
  const prevPinForAutoAdvanceRef = useRef('');

  const slug = normalizeUsernameSlug(usernameDraft);
  const styles = useMemo(() => createStyles(palette, insets.top), [palette, insets.top]);

  const convexReady = isConvexConfigured();
  const slugValidForCheck = slug.length >= 3 && isValidUsernameSlug(slug);
  const shouldCheckUsername = convexReady && Boolean(displayName.trim()) && slugValidForCheck;

  const usernameAvailability = useQuery(
    api.account.isUsernameAvailable,
    shouldCheckUsername ? { username: slug } : 'skip'
  );

  const usernameTaken =
    shouldCheckUsername &&
    usernameAvailability !== undefined &&
    usernameAvailability.available === false;
  const usernameCheckPending = shouldCheckUsername && usernameAvailability === undefined;

  const canContinueBasics =
    Boolean(displayName.trim()) &&
    slugValidForCheck &&
    !usernameTaken &&
    !usernameCheckPending;

  const previewName = displayName.trim() || 'You';
  const avatarSeed = slug.length >= 3 ? slug : previewName;

  useEffect(() => {
    if (!isConvexConfigured()) {
      Alert.alert(
        'Convex URL missing',
        'Set EXPO_PUBLIC_CONVEX_URL in your .env to create a cloud-backed account.'
      );
    }
  }, []);

  // Focus PIN inputs on step entry (Android often ignores immediate programmatic focus after navigation)
  useEffect(() => {
    if (step !== 1 && step !== 2) return;
    const delay = Platform.OS === 'android' ? 280 : 80;
    const ref = step === 1 ? pinInputRef : confirmPinInputRef;
    const t = setTimeout(() => ref.current?.focus(), delay);
    return () => clearTimeout(t);
  }, [step]);

  // Re-enable auto-advance only when the create-PIN value actually changes on step 1
  useEffect(() => {
    if (step === 1 && prevPinForAutoAdvanceRef.current !== pin) {
      suppressPinAutoAdvanceRef.current = false;
    }
    prevPinForAutoAdvanceRef.current = pin;
  }, [pin, step]);

  // Auto-advance step 1 → step 2 when PIN is complete (not when landing back from confirm with a full PIN)
  useEffect(() => {
    if (step !== 1 || pin.length !== PIN_LEN) return;
    if (suppressPinAutoAdvanceRef.current) return;
    const id = setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep(2);
      setConfirmPin('');
      setConfirmError(null);
    }, 200);
    return () => clearTimeout(id);
  }, [pin, step]);

  // Auto-submit step 2 when confirm PIN is complete
  useEffect(() => {
    if (step !== 2 || confirmPin.length !== PIN_LEN || busy) return;
    const id = setTimeout(() => {
      setConfirmError(null);
      if (confirmPin !== pin) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setConfirmError('PINs do not match. Try again.');
        setConfirmPin('');
        return;
      }
      void handleCreateAccount();
    }, 180);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPin, step, pin, busy]);

  const goBackOrDismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  /** Previous step inside the wizard, or dismiss when on profile step. */
  const handleHeaderPress = () => {
    if (step === 2) {
      suppressPinAutoAdvanceRef.current = true;
      setStep(1);
      setConfirmPin('');
      setConfirmError(null);
      return;
    }
    if (step === 1) {
      setStep(0);
      setPin('');
      return;
    }
    goBackOrDismiss();
  };

  const onSubmitSuccessNavigation = async () => {
    const pending =
      params.returnTo === 'pending-invite'
        ? useAccountInviteStore.getState().pendingInviteCode
        : null;
    const nameForJoin = displayName.trim() || useProfileStore.getState().name || 'You';

    if (pending) {
      useAccountInviteStore.getState().setPendingInviteCode(null);
      if (isConvexConfigured()) {
        try {
          const r = await joinConvexGroup({ code: pending });
          router.replace({ pathname: '/group/[id]', params: { id: r.groupId } });
          return;
        } catch {
          // Legacy local invite fallback
        }
      }
      const gid = joinGroupByCode(pending, nameForJoin);
      if (gid) {
        router.replace({ pathname: '/group/[id]', params: { id: gid } });
        return;
      }
    }

    goBackOrDismiss();
  };

  async function handleCreateAccount(): Promise<void> {
    if (!isConvexConfigured()) return;
    if (!slug || !displayName.trim() || pin.length !== PIN_LEN) return;
    if (!isValidUsernameSlug(slug)) {
      Alert.alert('Username', 'Use 3–20 characters: lowercase letters, numbers, or underscore.');
      return;
    }
    if (usernameTaken) {
      Alert.alert('Username taken', 'Pick a different username.');
      return;
    }
    setBusy(true);
    try {
      const trimmedName = displayName.trim();
      setName(trimmedName);
      setUsername(slug);

      await signIn('password', {
        flow: 'signUp',
        email: usernameToSyntheticEmail(slug),
        password: pin,
        name: trimmedName,
        username: slug,
      });

      syncViewerUsernameInGroups(slug);
      notifySuccess(toast, 'Account ready');
      await new Promise((r) => setTimeout(r, 120));
      await onSubmitSuccessNavigation();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not create account';
      Alert.alert('Sign up failed', msg);
      setUsername(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <HeroUINativeProvider>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
        <View style={styles.root}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <HeaderIconButton
              icon={step > 0 ? ChevronLeft : X}
              onPress={handleHeaderPress}
              accessibilityLabel={step > 0 ? 'Back' : 'Close'}
            />
            <Text style={styles.headerTitle}>New account</Text>
            <View style={styles.headerSide} />
          </View>

          {/* ── Step progress ── */}
          <StepProgress step={step} palette={palette} />

          {/* ── Step 0: Profile ── */}
          {step === 0 ? (
            <Animated.View
              key="step-profile"
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}>

              <View style={styles.avatarWrap}>
                <View style={styles.avatarRing}>
                  <Avatar
                    name={previewName}
                    size={space[12] + space[4]}
                    variant="person"
                    seed={avatarSeed}
                  />
                </View>
              </View>

              <Text style={styles.headline}>Profile</Text>
              <Text style={styles.subcopy}>Pick how you'll appear in groups.</Text>

              <View style={styles.fieldBlock}>
                <TextField>
                  <Label>Display name</Label>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Taylor"
                    placeholderTextColor={palette.placeholder}
                    keyboardAppearance={colorScheme === 'dark' ? 'dark' : 'light'}
                    autoCapitalize="words"
                    returnKeyType="next"
                    style={styles.inputFilled}
                  />
                </TextField>
              </View>

              <View style={styles.fieldBlock}>
                <TextField>
                  <Label>Username</Label>
                  <TextInput
                    value={usernameDraft}
                    onChangeText={(t) =>
                      setUsernameDraft(t.trim().replace(/[^\w]/gi, '').toLowerCase())
                    }
                    placeholder="taylor_m"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor={palette.placeholder}
                    keyboardAppearance={colorScheme === 'dark' ? 'dark' : 'light'}
                    returnKeyType="done"
                    style={styles.inputFilled}
                  />
                </TextField>
                {shouldCheckUsername ? (
                  usernameCheckPending ? (
                    <Text style={[styles.usernameStatus, { color: palette.labelTertiary }]}>
                      Checking availability…
                    </Text>
                  ) : usernameTaken ? (
                    <Text style={[styles.usernameStatus, { color: palette.negative }]}>
                      This username is already taken.
                    </Text>
                  ) : (
                    <Text style={[styles.usernameStatus, { color: palette.positive }]}>
                      Username available.
                    </Text>
                  )
                ) : (
                  <Description>3–20 chars · letters, numbers, underscore only.</Description>
                )}
              </View>
            </Animated.View>
          ) : null}

          {/* ── Step 1: Create PIN ── */}
          {step === 1 ? (
            <Animated.View
              key="step-pin"
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}>

              <Text style={styles.headline}>Create PIN</Text>
              <Text style={styles.subcopy}>Six digits to secure your account.</Text>

              <PinRow
                value={pin}
                hasError={false}
                palette={palette}
                inputRef={pinInputRef}
                accessibilityHint="Enter your six-digit PIN"
                inputProps={{
                  value: pin,
                  onChangeText: (t) => {
                    const next = t.replace(/\D/g, '').slice(0, PIN_LEN);
                    if (next.length > pin.length) {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setPin(next);
                  },
                  keyboardType: Platform.OS === 'android' ? 'numeric' : 'number-pad',
                  keyboardAppearance: colorScheme === 'dark' ? 'dark' : 'light',
                  // Android: secure + number keyboard often prevents IME; input is invisible anyway.
                  secureTextEntry: Platform.OS === 'ios',
                  caretHidden: true,
                  showSoftInputOnFocus: true,
                  underlineColorAndroid: 'transparent',
                  autoCorrect: false,
                  autoCapitalize: 'none',
                  maxLength: PIN_LEN,
                  autoFocus: Platform.OS === 'ios',
                  importantForAutofill: 'no',
                }}
              />
            </Animated.View>
          ) : null}

          {/* ── Step 2: Confirm PIN ── */}
          {step === 2 ? (
            <Animated.View
              key="step-confirm"
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(160)}>

              <Text style={styles.headline}>Confirm PIN</Text>
              <Text style={styles.subcopy}>Re-enter your six-digit PIN.</Text>

              <PinRow
                value={confirmPin}
                hasError={Boolean(confirmError)}
                palette={palette}
                inputRef={confirmPinInputRef}
                accessibilityHint="Confirm your six-digit PIN"
                inputProps={{
                  value: confirmPin,
                  onChangeText: (t) => {
                    setConfirmError(null);
                    const next = t.replace(/\D/g, '').slice(0, PIN_LEN);
                    if (next.length > confirmPin.length) {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setConfirmPin(next);
                  },
                  keyboardType: Platform.OS === 'android' ? 'numeric' : 'number-pad',
                  keyboardAppearance: colorScheme === 'dark' ? 'dark' : 'light',
                  secureTextEntry: Platform.OS === 'ios',
                  caretHidden: true,
                  showSoftInputOnFocus: true,
                  underlineColorAndroid: 'transparent',
                  autoCorrect: false,
                  autoCapitalize: 'none',
                  maxLength: PIN_LEN,
                  autoFocus: Platform.OS === 'ios',
                  importantForAutofill: 'no',
                }}
              />
              {confirmError ? (
                <Text style={styles.errorCaption}>{confirmError}</Text>
              ) : null}
            </Animated.View>
          ) : null}

          <View style={styles.spacer} />

          {/* ── Footer (safe bottom inset — critical on Android edge-to-edge) ── */}
          <SafeAreaView style={styles.footerSafe} edges={['bottom']}>
            <View style={styles.footer}>
              {step === 0 ? (
                <GlassButton
                  variant="primary"
                  isDisabled={!canContinueBasics}
                  onPress={() => setStep(1)}>
                  <GlassButton.Label>Continue</GlassButton.Label>
                </GlassButton>
              ) : null}

              {step === 1 ? (
                <GlassButton
                  variant="primary"
                  isDisabled={pin.length !== PIN_LEN}
                  onPress={() => {
                    setStep(2);
                    setConfirmPin('');
                    setConfirmError(null);
                  }}>
                  <GlassButton.Label>Continue</GlassButton.Label>
                </GlassButton>
              ) : null}

              {step === 2 ? (
                <GlassButton
                  variant="primary"
                  isDisabled={busy || confirmPin.length !== PIN_LEN || !isConvexConfigured()}
                  onPress={() => {
                    setConfirmError(null);
                    if (confirmPin !== pin) {
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      setConfirmError('PINs do not match. Try again.');
                      setConfirmPin('');
                      return;
                    }
                    void handleCreateAccount();
                  }}>
                  <GlassButton.Label>{busy ? 'Creating…' : 'Create account'}</GlassButton.Label>
                </GlassButton>
              ) : null}
            </View>
          </SafeAreaView>

        </View>
      </KeyboardAvoidingView>
    </HeroUINativeProvider>
  );
}
