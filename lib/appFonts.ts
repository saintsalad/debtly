import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import type { TextStyle } from 'react-native';

/** Loaded font names for `useFonts` / `Font.loadAsync`. */
export const appFontMap = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} as const;

/** Stable names for Reanimated worklets (avoid importing heavy helpers). */
export const APP_SANS_INTER = {
  w400: 'Inter_400Regular',
  w500: 'Inter_500Medium',
  w600: 'Inter_600SemiBold',
  w700: 'Inter_700Bold',
} as const;

function normalizedWeight(weight: TextStyle['fontWeight'] | undefined): string {
  if (weight == null || weight === 'normal') return '400';
  if (weight === 'bold') return '700';
  return String(weight);
}

/** Maps semantic / numeric weight to the loaded Inter face (required on React Native). */
export function sansForWeight(weight: TextStyle['fontWeight'] | undefined): string {
  const w = normalizedWeight(weight);
  if (w === '500') return APP_SANS_INTER.w500;
  if (w === '600') return APP_SANS_INTER.w600;
  if (w === '700' || w === '800' || w === '900') return APP_SANS_INTER.w700;
  if (w === '100' || w === '200' || w === '300') return APP_SANS_INTER.w400;
  return APP_SANS_INTER.w400;
}

/** Receipt / mono stack — same faces on iOS, Android, and web (after load). */
export function monoForWeight(weight: TextStyle['fontWeight'] | undefined): string {
  const w = normalizedWeight(weight);
  if (w === '600') return 'JetBrainsMono_600SemiBold';
  if (w === '700' || w === '800' || w === '900' || w === 'bold') return 'JetBrainsMono_700Bold';
  return 'JetBrainsMono_400Regular';
}
