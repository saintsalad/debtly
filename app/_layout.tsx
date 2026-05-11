import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useSyncUniwindTheme } from '@/hooks/use-sync-uniwind-theme';
import { AddDebtProvider } from '@/lib/addDebtContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  useSyncUniwindTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <HeroUINativeProvider>
          <BottomSheetModalProvider>
            <AddDebtProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
            </AddDebtProvider>
          </BottomSheetModalProvider>
        </HeroUINativeProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
