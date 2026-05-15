import { useMemo } from 'react';
import { Platform, type ViewStyle } from 'react-native';

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { cardShadow, useColors, type ColorPalette } from '@/lib/platform';
import { glassBorderStyle, type GlassBorderVariant } from '@/lib/glassBorder';

/** Frosted fill for grouped cards on the blue gradient background (dark mode only). */
export function glassSurfaceFill(scheme: 'light' | 'dark', surface: string): string {
  return scheme === 'dark' ? 'rgba(255, 255, 255, 0.09)' : surface;
}

export function glassSurfaceFillPressed(
  scheme: 'light' | 'dark',
  fill: string
): string {
  return scheme === 'dark' ? 'rgba(255, 255, 255, 0.14)' : fill;
}

/** Inset wells inside glass cards (e.g. bill-split total row). */
export function glassInsetFill(
  scheme: 'light' | 'dark',
  fillSecondary: string
): string {
  return scheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : fillSecondary;
}

export function glassSeparatorColor(
  scheme: 'light' | 'dark',
  separator: string
): string {
  return scheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : separator;
}

export function glassSurfaceStyle(
  scheme: 'light' | 'dark',
  palette: ColorPalette,
  variant: GlassBorderVariant = 'surface'
): ViewStyle {
  if (scheme === 'dark') {
    return {
      backgroundColor: glassSurfaceFill(scheme, palette.surface),
      ...glassBorderStyle(scheme, variant),
    };
  }
  return { backgroundColor: palette.surface };
}

export function glassCardShadowStyle(scheme: 'light' | 'dark'): ViewStyle {
  if (scheme === 'dark') {
    return Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 16,
        }
      : { elevation: 0 };
  }
  return cardShadow;
}

export function useGlassSurface(variant: GlassBorderVariant = 'surface') {
  const scheme = useAppColorScheme();
  const palette = useColors();
  return useMemo(() => glassSurfaceStyle(scheme, palette, variant), [scheme, palette, variant]);
}

export function useGlassSurfacePressed() {
  const scheme = useAppColorScheme();
  const palette = useColors();
  return useMemo(
    () => glassSurfaceFillPressed(scheme, palette.fill),
    [scheme, palette.fill]
  );
}

export function useGlassInsetFill() {
  const scheme = useAppColorScheme();
  const palette = useColors();
  return useMemo(
    () => glassInsetFill(scheme, palette.fillSecondary),
    [scheme, palette.fillSecondary]
  );
}

export function useGlassSeparatorColor() {
  const scheme = useAppColorScheme();
  const palette = useColors();
  return useMemo(
    () => glassSeparatorColor(scheme, palette.separator),
    [scheme, palette.separator]
  );
}

export function useGlassCardShadow() {
  const scheme = useAppColorScheme();
  return useMemo(() => glassCardShadowStyle(scheme), [scheme]);
}
