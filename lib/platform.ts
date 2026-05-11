import { Platform } from 'react-native';

const IOS = Platform.OS === 'ios';

/** System-native color tokens. Prefer these over hardcoded hex values. */
export const colors = {
  // Backgrounds
  bg:              IOS ? '#F2F2F7' : '#F6F6F6',
  surface:         '#FFFFFF',
  surfaceRaised:   IOS ? '#FFFFFF' : '#FFFFFF',
  fill:            IOS ? 'rgba(120,120,128,0.12)' : 'rgba(0,0,0,0.06)',
  fillSecondary:   IOS ? 'rgba(120,120,128,0.08)' : 'rgba(0,0,0,0.04)',

  // Labels
  label:           IOS ? '#000000' : '#111111',
  labelSecondary:  IOS ? '#8E8E93' : '#6B6B6B',
  labelTertiary:   IOS ? '#C7C7CC' : '#ABABAB',
  placeholder:     IOS ? '#C7C7CC' : '#ABABAB',

  // Separators
  separator:       IOS ? 'rgba(60,60,67,0.29)' : 'rgba(0,0,0,0.12)',
  opaqueSeparator: IOS ? '#C6C6C8' : '#E5E5E5',

  // Tint / interactive
  tint:            IOS ? '#007AFF' : '#1B72E8',
  tintMuted:       IOS ? 'rgba(0,122,255,0.12)' : 'rgba(27,114,232,0.1)',

  // Semantic
  positive:        IOS ? '#34C759' : '#2E7D32',
  positiveSoft:    IOS ? 'rgba(52,199,89,0.12)' : 'rgba(46,125,50,0.1)',
  negative:        IOS ? '#FF3B30' : '#C62828',
  negativeSoft:    IOS ? 'rgba(255,59,48,0.10)' : 'rgba(198,40,40,0.08)',
  warning:         IOS ? '#FF9500' : '#E65100',
  warningSoft:     IOS ? 'rgba(255,149,0,0.10)' : 'rgba(230,81,0,0.08)',

  // Tab bar
  tabActive:       IOS ? '#007AFF' : '#1B72E8',
  tabInactive:     IOS ? '#8E8E93' : '#9E9E9E',
} as const;

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

/** Radius tokens — tighter on Android to match Material. */
export const radius = {
  sm:   IOS ? 8  : 6,
  md:   IOS ? 12 : 8,
  card: IOS ? 14 : 10,
  lg:   IOS ? 18 : 14,
  xl:   IOS ? 26 : 20,
  pill: 9999,
} as const;

/** Card shadow — iOS uses shadow props, Android uses elevation. */
export const cardShadow = IOS
  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 0.5 }, shadowOpacity: 0.1, shadowRadius: 6 }
  : { elevation: 1 };
