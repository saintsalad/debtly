import { Platform, type TextStyle } from 'react-native';

import { sansForWeight } from '@/lib/appFonts';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import * as Tok from '@/lib/theme/tokens';

const IOS = Platform.OS === 'ios';

export function createPalette(scheme: 'light' | 'dark') {
  const dark = scheme === 'dark';
  const sk = dark ? 'dark' : 'light';

  const surf = IOS ? Tok.surfaces.ios : Tok.surfaces.android;
  const fill = IOS ? Tok.fills.ios : Tok.fills.android;
  const sep = IOS ? Tok.separators.ios : Tok.separators.android;
  const tertiary = IOS ? Tok.labels.tertiary.ios : Tok.labels.tertiary.android;
  const tint = IOS ? Tok.brand.tint.ios : Tok.brand.tint.android;
  const tintMuted = IOS ? Tok.brand.tintMuted.ios : Tok.brand.tintMuted.android;
  const pos = IOS ? Tok.semantic.positive.ios : Tok.semantic.positive.android;
  const posSoft = IOS ? Tok.semantic.positiveSoft.ios : Tok.semantic.positiveSoft.android;
  const neg = IOS ? Tok.semantic.negative.ios : Tok.semantic.negative.android;
  const negSoft = IOS ? Tok.semantic.negativeSoft.ios : Tok.semantic.negativeSoft.android;
  const warn = IOS ? Tok.semantic.warning.ios : Tok.semantic.warning.android;
  const warnSoft = IOS ? Tok.semantic.warningSoft.ios : Tok.semantic.warningSoft.android;
  const labelPrimary = IOS ? Tok.textPrimary.ios : Tok.textPrimary.android;

  const fillSk = fill[sk];
  const tintSk = tint[sk];

  return {
    bg: surf.bg[sk],
    surface: surf.elevated[sk],
    surfaceRaised: surf.raised[sk],
    fill: fillSk.primary,
    fillSecondary: fillSk.secondary,

    label: labelPrimary[sk],
    labelSecondary: Tok.neutral.secondaryLabel,
    labelTertiary: tertiary[sk],
    placeholder: tertiary[sk],

    separator: sep.translucent[sk],
    opaqueSeparator: sep.opaque[sk],

    tint: tintSk,
    tintMuted: tintMuted[sk],

    positive: pos[sk],
    positiveSoft: posSoft[sk],
    negative: neg[sk],
    negativeSoft: negSoft[sk],
    warning: warn[sk],
    warningSoft: warnSoft[sk],

    tabActive: tintSk,
    tabInactive: Tok.neutral.secondaryLabel,
  } as const;
}

export type ColorPalette = ReturnType<typeof createPalette>;

/** System-native color tokens. Prefer these over hardcoded hex values. */
export const colors = createPalette('light');

export function useColors(): ColorPalette {
  const scheme = useAppColorScheme();
  return createPalette(scheme);
}

function appTypeStyle<T extends Pick<TextStyle, 'fontSize' | 'fontWeight' | 'letterSpacing'>>(
  spec: T
): T & { fontFamily: string } {
  return { ...spec, fontFamily: sansForWeight(spec.fontWeight) };
}

/** iOS HIG type scale + Inter (same metrics/weights on all platforms). Prefer these over ad-hoc font sizes. */
export const type = {
  largeTitle: appTypeStyle({ fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 }),
  title1: appTypeStyle({ fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 }),
  title2: appTypeStyle({ fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 }),
  title3: appTypeStyle({ fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 }),
  headline: appTypeStyle({ fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 }),
  body: appTypeStyle({ fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 }),
  callout: appTypeStyle({ fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 }),
  subheadline: appTypeStyle({ fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 }),
  footnote: appTypeStyle({ fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 }),
  caption1: appTypeStyle({ fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 }),
  caption2: appTypeStyle({ fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 }),
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
  ? {
      shadowColor: Tok.shadow.color,
      shadowOffset: { width: 0, height: 0.5 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    }
  : { elevation: 1 };

export function useCardShadow() {
  const scheme = useAppColorScheme();
  if (scheme === 'dark') {
    return IOS
      ? {
          shadowColor: Tok.shadow.color,
          shadowOffset: { width: 0, height: 0.5 },
          shadowOpacity: 0.24,
          shadowRadius: 8,
        }
      : { elevation: 2 };
  }
  return cardShadow;
}

/** Shared screen layout insets. */
export const layout = {
  screenPaddingX: space[4],
  screenPaddingBottom: 120,
} as const;
