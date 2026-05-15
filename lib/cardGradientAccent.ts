import { useMemo } from 'react';

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

export type GlassCardAccent = 'aurora' | 'dual' | 'pulse';

export type GlassCardAccentConfig = {
  borderColors: readonly [string, string, ...string[]];
  glowColors: readonly [string, string, string];
};

function accentPalette(
  scheme: 'light' | 'dark',
  accent: GlassCardAccent
): GlassCardAccentConfig {
  const light = scheme === 'light';

  switch (accent) {
    case 'aurora':
      return light
        ? {
            borderColors: ['#0EA5E9', '#6366F1', '#A855F7'],
            glowColors: ['rgba(14,165,233,0.22)', 'rgba(99,102,241,0.12)', 'transparent'],
          }
        : {
            borderColors: ['#22D3EE', '#818CF8', '#C084FC'],
            glowColors: ['rgba(34,211,238,0.38)', 'rgba(129,140,248,0.2)', 'transparent'],
          };
    case 'dual':
      return light
        ? {
            borderColors: ['#22C55E', '#F59E0B', '#F43F5E'],
            glowColors: ['rgba(34,197,94,0.2)', 'rgba(245,158,11,0.1)', 'transparent'],
          }
        : {
            borderColors: ['#4ADE80', '#FBBF24', '#FB7185'],
            glowColors: ['rgba(74,222,128,0.32)', 'rgba(251,191,36,0.14)', 'transparent'],
          };
    case 'pulse':
      return light
        ? {
            borderColors: ['#D946EF', '#8B5CF6', '#3B82F6'],
            glowColors: ['rgba(217,70,239,0.2)', 'rgba(139,92,246,0.12)', 'transparent'],
          }
        : {
            borderColors: ['#F472B6', '#A78BFA', '#60A5FA'],
            glowColors: ['rgba(244,114,182,0.34)', 'rgba(167,139,250,0.18)', 'transparent'],
          };
  }
}

export function glassCardAccentConfig(
  scheme: 'light' | 'dark',
  accent: GlassCardAccent
): GlassCardAccentConfig {
  return accentPalette(scheme, accent);
}

export function useGlassCardAccent(accent?: GlassCardAccent): GlassCardAccentConfig | null {
  const scheme = useAppColorScheme();
  return useMemo(
    () => (accent ? glassCardAccentConfig(scheme, accent) : null),
    [scheme, accent]
  );
}
