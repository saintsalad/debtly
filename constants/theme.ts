import { monoForWeight, sansForWeight } from '@/lib/appFonts';

import { createPalette } from '@/lib/platform';

/** Maps the canonical palette to legacy keys used by `useThemeColor` / `ThemedText`. */
function legacyColors(scheme: 'light' | 'dark') {
  const p = createPalette(scheme);
  return {
    text: p.label,
    background: p.bg,
    tint: p.tint,
    icon: p.labelSecondary,
    tabIconDefault: p.tabInactive,
    tabIconSelected: p.tabActive,
    card: p.surface,
    border: p.opaqueSeparator,
    muted: p.labelTertiary,
  };
}

/** @deprecated Prefer `useColors()` from `@/lib/platform`; kept for `useThemeColor` compatibility. */
export const Colors = {
  light: legacyColors('light'),
  dark: legacyColors('dark'),
};

/**
 * App typography families (Inter + JetBrains Mono), loaded via `appFontMap` in the root layout.
 * Use `sansForWeight` / `monoForWeight` when changing `fontWeight` so the correct face is selected on React Native.
 */
export const Fonts = {
  sans: sansForWeight('400'),
  sansForWeight,
  serif: sansForWeight('400'),
  rounded: sansForWeight('400'),
  mono: monoForWeight('400'),
  monoForWeight,
};
