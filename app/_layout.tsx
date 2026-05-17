import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useSyncUniwindTheme } from '@/hooks/use-sync-uniwind-theme';
import { AddDebtProvider } from '@/lib/addDebtContext';
import { StatusBarScrollFadeProvider } from '@/lib/statusBarScrollFade';
import { TransactionDetailProvider } from '@/lib/transactionDetailContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScopedTheme } from 'uniwind';
import { GroupInviteLinkHandler } from '@/features/group-expense/GroupInviteLinkHandler';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  useSyncUniwindTheme();
  const { width: windowWidth } = useWindowDimensions();
  const safeArea = useSafeAreaInsets();

  const toastContentWrapper = useCallback((children: ReactNode) => {
    return (
      <ScopedTheme theme="dark">
        <View className="flex-1" pointerEvents="box-none">
          {children}
        </View>
      </ScopedTheme>
    );
  }, []);

  const heroUiNativeConfig = useMemo(
    () => ({
      toast: {
        defaultProps: { placement: 'top' as const },
        insets: {
          top: safeArea.top + 8,
          left: Math.max(windowWidth * 0.15, safeArea.left + 8),
          right: Math.max(windowWidth * 0.15, safeArea.right + 8),
        },
        contentWrapper: toastContentWrapper,
      },
    }),
    [
      windowWidth,
      safeArea.top,
      safeArea.left,
      safeArea.right,
      toastContentWrapper,
    ]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <HeroUINativeProvider config={heroUiNativeConfig}>
          <BottomSheetModalProvider>
            <AddDebtProvider>
              <TransactionDetailProvider>
                <StatusBarScrollFadeProvider>
                  <GroupInviteLinkHandler />
                  <Stack>
                    <Stack.Screen
                      name="(tabs)"
                      options={{
                        headerShown: false,
                        contentStyle: { backgroundColor: 'transparent' },
                      }}
                    />
                    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                    <Stack.Screen
                      name="add-transaction"
                      options={{ presentation: 'fullScreenModal', headerShown: false }}
                    />
                    <Stack.Screen
                      name="transaction/[id]"
                      options={{ presentation: 'fullScreenModal', headerShown: false }}
                    />
                    <Stack.Screen
                      name="transaction-receipt/[id]"
                      options={{ presentation: 'fullScreenModal', headerShown: false }}
                    />
                    <Stack.Screen
                      name="edit-transaction/[id]"
                      options={{ presentation: 'fullScreenModal', headerShown: false }}
                    />
                    <Stack.Screen
                      name="insights"
                      options={{ presentation: 'fullScreenModal', headerShown: false }}
                    />
                    <Stack.Screen
                      name="group/[id]"
                      options={{ presentation: 'fullScreenModal', headerShown: false }}
                    />
                  </Stack>
                </StatusBarScrollFadeProvider>
              </TransactionDetailProvider>
            </AddDebtProvider>
          </BottomSheetModalProvider>
        </HeroUINativeProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
