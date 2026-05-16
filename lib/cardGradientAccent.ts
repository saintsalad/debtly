import { useMemo } from 'react';

import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { decorativeGlassCard } from '@/lib/theme/tokens';

export type GlassCardAccent = 'aurora' | 'dual' | 'pulse';

export type GlassCardAccentConfig = {
  borderColors: readonly [string, string, ...string[]];
  glowColors: readonly [string, string, string];
};

function accentPalette(
  scheme: 'light' | 'dark',
  accent: GlassCardAccent
): GlassCardAccentConfig {
  const sk = scheme === 'light' ? 'light' : 'dark';

  switch (accent) {
    case 'aurora': {
      const c = decorativeGlassCard.aurora[sk];
      return {
        borderColors: [...c.borderColors],
        glowColors: [...c.glowColors],
      };
    }
    case 'dual': {
      const c = decorativeGlassCard.dual[sk];
      return {
        borderColors: [...c.borderColors],
        glowColors: [...c.glowColors],
      };
    }
    case 'pulse': {
      const c = decorativeGlassCard.pulse[sk];
      return {
        borderColors: [...c.borderColors],
        glowColors: [...c.glowColors],
      };
    }
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
