import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Description, HeroUINativeProvider, Label, TextField, useToast } from 'heroui-native';
import * as Haptics from 'expo-haptics';

import { GlassButton } from '@/components/ui/GlassButton';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ChevronDown } from 'lucide-react-native';
import {
  isValidUsernameSlug,
  normalizeUsernameSlug,
  usernameToSyntheticEmail,
} from '@/lib/account/accountConstants';
import { notifySuccess } from '@/lib/appToast';
import { isConvexConfigured } from '@/lib/convex/env';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useColors, radius, space, type, type ColorPalette } from '@/lib/platform';
import { useAccountInviteStore } from '@/stores/accountInviteStore';
import { useAuthActions } from '@convex-dev/auth/react';
import { useProfileStore } from '@/stores/profileStore';
import { useGroupExpenseStore } from '@/stores/groupExpenseStore';

const PIN_LEN = 6;

function createStyles(palette: ColorPalette, topPad: number) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: topPad + space[4],
      paddingHorizontal: space[5],
      backgroundColor: palette.bg,
    },
    headline: {
      ...type.largeTitle,
      color: palette.label,
      marginBottom: space[3],
      marginTop: space[4],
    },
    subcopy: {
      ...type.subheadline,
      color: palette.labelSecondary,
      marginBottom: space[6],
    },
    fieldBlock: {
      gap: space[2],
      marginBottom: space[5],
    },
    inputFilled: {
      ...type.body,
      color: palette.label,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      borderRadius: radius.md,
      backgroundColor: palette.fill,
      minHeight: 48,
    },
    spacer: { flexGrow: 1 },
    footer: {
      paddingBottom: space[8],
      gap: space[3],
    },
    stepChipRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: space[2],
      marginBottom: space[4],
    },
    stepChip: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.fill,
    },
    stepChipActive: {
      backgroundColor: palette.tint,
    },
    errorCaption: {
      ...type.caption1,
      color: palette.negative,
      marginTop: space[2],
    },
    pinDots: {
      ...type.title1,
      color: palette.label,
      letterSpacing: 10,
      textAlign: 'center',
      minHeight: 36,
      marginVertical: space[4],
      fontVariant: ['tabular-nums'],
    },
  });
}

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

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [displayName, setDisplayName] = useState(presetName === 'Friend' ? '' : presetName);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const slug = normalizeUsernameSlug(usernameDraft);
  const styles = useMemo(() => createStyles(palette, insets.top), [palette, insets.top]);

  React.useEffect(() => {
    if (!isConvexConfigured()) {
      Alert.alert(
        'Convex URL missing',
        'Set EXPO_PUBLIC_CONVEX_URL in your .env to create a cloud-backed account.'
      );
    }
  }, []);

  const goBackOrDismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  const onSubmitSuccessNavigation = () => {
    const pending =
      params.returnTo === 'pending-invite'
        ? useAccountInviteStore.getState().pendingInviteCode
        : null;
    const nameForJoin = displayName.trim() || useProfileStore.getState().name || 'You';

    if (pending) {
      useAccountInviteStore.getState().setPendingInviteCode(null);
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

      onSubmitSuccessNavigation();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not create account';
      Alert.alert('Sign up failed', msg);
      setUsername(null);
    } finally {
      setBusy(false);
    }
  }


  const canContinueBasics =
    Boolean(displayName.trim()) && slug.length >= 3 && isValidUsernameSlug(slug);

  const canContinuePin = pin.length === PIN_LEN && /^\d+$/.test(pin);

  const showConfirmError = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setConfirmError('PINs do not match. Try again.');
  };

  return (
    <HeroUINativeProvider>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.root}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[2] }}>
            <HeaderIconButton
              icon={ChevronDown}
              onPress={goBackOrDismiss}
              accessibilityLabel="Close"
            />
            <Text style={[type.footnote as object, { color: palette.labelTertiary, flex: 1, textAlign: 'center', marginRight: 40 }]}>
              New account
            </Text>
          </View>

          <View style={styles.stepChipRow}>
            {([0, 1, 2] as const).map((i) => (
              <View key={i} style={[styles.stepChip, step === i && styles.stepChipActive]} />
            ))}
          </View>

          {step === 0 ? (
            <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
              <Text style={styles.headline}>Profile</Text>
              <Description style={[styles.subcopy as object]}>Pick how you&apos;ll appear in groups.</Description>
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
                    style={styles.inputFilled}
                  />
                </TextField>
                <Description>3–20 chars · letters, numbers, underscore only.</Description>
              </View>
            </Animated.View>
          ) : null}

          {step === 1 ? (
            <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
              <Text style={styles.headline}>Create PIN</Text>
              <Description style={[styles.subcopy as object]}>Six digits for signing in.</Description>
              <Text style={styles.pinDots}>{'●'.repeat(pin.length)}{'○'.repeat(PIN_LEN - pin.length)}</Text>
              <TextInput
                value={pin}
                onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, PIN_LEN))}
                keyboardType="number-pad"
                keyboardAppearance={colorScheme === 'dark' ? 'dark' : 'light'}
                secureTextEntry
                style={{ position: 'absolute', opacity: 0.02, height: 1 }}
                autoFocus
              />
              <GlassButton variant="secondary" onPress={() => setStep(0)}>
                <GlassButton.Label>Back</GlassButton.Label>
              </GlassButton>
            </Animated.View>
          ) : null}

          {step === 2 ? (
            <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
              <Text style={styles.headline}>Confirm PIN</Text>
              <Description style={[styles.subcopy as object]}>Re-enter your six-digit PIN.</Description>
              <Text style={styles.pinDots}>{'●'.repeat(confirmPin.length)}{'○'.repeat(PIN_LEN - confirmPin.length)}</Text>
              {confirmError ? <Text style={styles.errorCaption}>{confirmError}</Text> : null}
              <TextInput
                value={confirmPin}
                onChangeText={(t) => {
                  setConfirmError(null);
                  setConfirmPin(t.replace(/\D/g, '').slice(0, PIN_LEN));
                }}
                keyboardType="number-pad"
                keyboardAppearance={colorScheme === 'dark' ? 'dark' : 'light'}
                secureTextEntry
                style={{ position: 'absolute', opacity: 0.02, height: 1 }}
                autoFocus
              />
              <GlassButton variant="secondary" onPress={() => { setStep(1); setConfirmPin(''); }}>
                <GlassButton.Label>Back</GlassButton.Label>
              </GlassButton>
            </Animated.View>
          ) : null}

          <View style={styles.spacer} />

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
                isDisabled={!canContinuePin}
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
                isDisabled={
                  busy || confirmPin.length !== PIN_LEN || !isConvexConfigured()
                }
                onPress={() => {
                  setConfirmError(null);
                  if (confirmPin !== pin) {
                    showConfirmError();
                    return;
                  }
                  void handleCreateAccount();
                }}>
                <GlassButton.Label>Create account</GlassButton.Label>
              </GlassButton>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </HeroUINativeProvider>
  );
}
