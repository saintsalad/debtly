import { useMemo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

/** Hairline stroke for liquid-glass button rims. */
export const glassBorderWidth = StyleSheet.hairlineWidth;

export type GlassBorderVariant = 'secondary' | 'tint' | 'positive' | 'surface';

export function glassBorderColor(
  scheme: 'light' | 'dark',
  variant: GlassBorderVariant = 'secondary'
): string {
  const light = scheme === 'light';
  switch (variant) {
    case 'tint':
      return 'rgba(255, 255, 255, 0.28)';
    case 'positive':
      return light ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.2)';
    case 'surface':
      return light ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.14)';
    case 'secondary':
    default:
      return light ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.16)';
  }
}

export function glassBorderStyle(
  scheme: 'light' | 'dark',
  variant: GlassBorderVariant = 'secondary'
): Pick<ViewStyle, 'borderWidth' | 'borderColor'> {
  return {
    borderWidth: glassBorderWidth,
    borderColor: glassBorderColor(scheme, variant),
  };
}

export function useGlassBorder(variant: GlassBorderVariant = 'secondary') {
  const scheme = useAppColorScheme();
  return useMemo(() => glassBorderStyle(scheme, variant), [scheme, variant]);
}

/** Maps HeroUI `Button` variants to glass rim intensity. */
export function heroVariantToGlass(variant?: string): GlassBorderVariant {
  if (variant === 'primary') return 'tint';
  if (variant === 'ghost') return 'surface';
  return 'secondary';
}
