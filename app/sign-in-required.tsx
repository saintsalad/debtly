import { ConvexAccountPromptCard } from '@/features/group-expense/ConvexAccountPromptCard';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { HeroUINativeProvider } from 'heroui-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius, space, type, useColors, type ColorPalette } from '@/lib/platform';
import { useAccountInviteStore } from '@/stores/accountInviteStore';

function createStyles(palette: ColorPalette, topInset: number) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: Math.max(topInset, space[2]),
      paddingBottom: space[3],
    },
    headerTitle: {
      ...type.headline,
      fontWeight: '600',
      color: palette.label,
      flex: 1,
      textAlign: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: layout.screenPaddingX,
      paddingVertical: space[6],
      justifyContent: 'center',
      alignItems: 'center',
      gap: space[6],
    },
    card: {
      width: '100%',
      maxWidth: 380,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      paddingVertical: space[6],
      paddingHorizontal: space[4],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.opaqueSeparator,
      alignSelf: 'center',
    },
  });
}

/**
 * Intermediate step before create-account when a feature needs Convex auth —
 * avoids jumping straight into signup without explaining why.
 */
export default function SignInRequiredScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette, insets.top), [palette, insets.top]);

  const dismiss = useCallback(() => {
    useAccountInviteStore.getState().setPendingInviteCode(null);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/bill-split');
  }, [router]);

  const continueToSignIn = useCallback(() => {
    router.push({ pathname: '/create-account', params: { returnTo: 'pending-invite' } });
  }, [router]);

  return (
    <HeroUINativeProvider>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <View style={styles.header}>
          <HeaderIconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={dismiss} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            Sign in needed
          </Text>
          <View style={{ width: 36, height: 36 }} accessibilityElementsHidden />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <ConvexAccountPromptCard
              variant="join"
              footerNote="Invite saved — finish joining after sign-in."
              onContinueToSignIn={continueToSignIn}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </HeroUINativeProvider>
  );
}
