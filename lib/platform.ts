import { Platform } from 'react-native';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

const IOS = Platform.OS === 'ios';

function createPalette(scheme: 'light' | 'dark') {
  const dark = scheme === 'dark';

  return {
    // Backgrounds
    bg:              dark ? (IOS ? '#000000' : '#121212') : (IOS ? '#F2F2F7' : '#F6F6F6'),
    surface:         dark ? (IOS ? '#1C1C1E' : '#1E1E1E') : '#FFFFFF',
    surfaceRaised:   dark ? (IOS ? '#2C2C2E' : '#252525') : '#FFFFFF',
    fill:            dark
      ? (IOS ? 'rgba(120,120,128,0.24)' : 'rgba(255,255,255,0.08)')
      : (IOS ? 'rgba(120,120,128,0.12)' : 'rgba(0,0,0,0.06)'),
    fillSecondary:   dark
      ? (IOS ? 'rgba(120,120,128,0.16)' : 'rgba(255,255,255,0.06)')
      : (IOS ? 'rgba(120,120,128,0.08)' : 'rgba(0,0,0,0.04)'),

    // Labels
    label:           dark ? '#FFFFFF' : (IOS ? '#000000' : '#111111'),
    labelSecondary:  '#8E8E93',
    labelTertiary:   dark ? (IOS ? '#636366' : '#757575') : (IOS ? '#C7C7CC' : '#ABABAB'),
    placeholder:     dark ? (IOS ? '#636366' : '#757575') : (IOS ? '#C7C7CC' : '#ABABAB'),

    // Separators
    separator:       dark
      ? (IOS ? 'rgba(84,84,88,0.65)' : 'rgba(255,255,255,0.12)')
      : (IOS ? 'rgba(60,60,67,0.29)' : 'rgba(0,0,0,0.12)'),
    opaqueSeparator: dark ? (IOS ? '#38383A' : '#2E2E2E') : (IOS ? '#C6C6C8' : '#E5E5E5'),

    // Tint / interactive
    tint:            dark ? (IOS ? '#0A84FF' : '#4C8DFF') : (IOS ? '#007AFF' : '#1B72E8'),
    tintMuted:       dark
      ? (IOS ? 'rgba(10,132,255,0.18)' : 'rgba(76,141,255,0.16)')
      : (IOS ? 'rgba(0,122,255,0.12)' : 'rgba(27,114,232,0.1)'),

    // Semantic
    positive:        dark ? (IOS ? '#30D158' : '#66BB6A') : (IOS ? '#34C759' : '#2E7D32'),
    positiveSoft:    dark
      ? (IOS ? 'rgba(48,209,88,0.16)' : 'rgba(102,187,106,0.16)')
      : (IOS ? 'rgba(52,199,89,0.12)' : 'rgba(46,125,50,0.1)'),
    negative:        dark ? (IOS ? '#FF453A' : '#EF5350') : (IOS ? '#FF3B30' : '#C62828'),
    negativeSoft:    dark
      ? (IOS ? 'rgba(255,69,58,0.16)' : 'rgba(239,83,80,0.16)')
      : (IOS ? 'rgba(255,59,48,0.10)' : 'rgba(198,40,40,0.08)'),
    warning:         dark ? (IOS ? '#FF9F0A' : '#FFB74D') : (IOS ? '#FF9500' : '#E65100'),
    warningSoft:     dark
      ? (IOS ? 'rgba(255,159,10,0.16)' : 'rgba(255,183,77,0.16)')
      : (IOS ? 'rgba(255,149,0,0.10)' : 'rgba(230,81,0,0.08)'),

    // Tab bar
    tabActive:       dark ? (IOS ? '#0A84FF' : '#4C8DFF') : (IOS ? '#007AFF' : '#1B72E8'),
    tabInactive:     '#8E8E93',
  } as const;
}

export type ColorPalette = ReturnType<typeof createPalette>;

/** System-native color tokens. Prefer these over hardcoded hex values. */
export const colors = createPalette('light');

export function useColors(): ColorPalette {
  const scheme = useAppColorScheme();
  return createPalette(scheme);
}

/** iOS HIG type scale. Use these instead of ad-hoc font sizes. */
export const type = {
  largeTitle:   { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
  title1:       { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
  title2:       { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
  title3:       { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
  headline:     { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
  body:         { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
  callout:      { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
  subheadline:  { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
  footnote:     { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
  caption1:     { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
  caption2:     { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
} as const;

/** Strict 4pt spacing grid. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

/** Soft corner radii — consistent across platforms. */
export const radius = {
  sm: 10,
  md: 16,
  card: 22,
  lg: 22,
  xl: 28,
  xxl: 36,
  pill: 9999,
} as const;

/** Card shadow — iOS uses shadow props, Android uses elevation. */
export const cardShadow = IOS
  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 0.5 }, shadowOpacity: 0.1, shadowRadius: 6 }
  : { elevation: 1 };

export function useCardShadow() {
  const scheme = useAppColorScheme();
  if (scheme === 'dark') {
    return IOS
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 0.5 }, shadowOpacity: 0.24, shadowRadius: 8 }
      : { elevation: 2 };
  }
  return cardShadow;
}

/** Shared screen layout insets. */
export const layout = {
  screenPaddingX: space[4],
  screenPaddingBottom: 120,
} as const;
