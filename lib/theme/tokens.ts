/**
 * Debtly color tokens — single place to adjust brand and semantic colors.
 *
 * - StyleSheet UI uses `useColors()` from `@/lib/platform` (built from these tokens).
 * - Legacy `Colors` in `constants/theme.ts` is derived from the same palette.
 *
 * HeroUI Native + Uniwind read CSS variables from HeroUI’s stylesheet defaults.
 * To align Tailwind/class-based surfaces with this accent, extend `global.css`
 * `@layer theme` using the same hex values as `brand.tint` / `semantic` below.
 */

export const chrome = {
  /** Tab icons on the blurred floating pill while the app is in light mode */
  floatingTabIconActiveOnGlass: '#FFFFFF',
  floatingTabIconInactiveOnGlass: 'rgba(255, 255, 255, 0.52)',
  /** Android floating pill shell */
  floatingTabBarAndroid: 'rgba(28, 28, 30, 0.9)',
} as const;

export const iosBlurScrim = {
  light: 'rgba(0, 0, 0, 0.18)',
  dark: 'rgba(0, 0, 0, 0.38)',
} as const;

/** Shadows shared by elevation helpers */
export const shadow = {
  color: '#000000',
} as const;

export const fills = {
  ios: {
    light: {
      primary: 'rgba(120,120,128,0.12)',
      secondary: 'rgba(120,120,128,0.08)',
    },
    dark: {
      primary: 'rgba(120,120,128,0.24)',
      secondary: 'rgba(120,120,128,0.16)',
    },
  },
  android: {
    light: {
      primary: 'rgba(0,0,0,0.06)',
      secondary: 'rgba(0,0,0,0.04)',
    },
    dark: {
      primary: 'rgba(255,255,255,0.08)',
      secondary: 'rgba(255,255,255,0.06)',
    },
  },
} as const;

export const separators = {
  ios: {
    translucent: {
      light: 'rgba(60,60,67,0.29)',
      dark: 'rgba(84,84,88,0.65)',
    },
    opaque: {
      light: '#C6C6C8',
      dark: '#38383A',
    },
  },
  android: {
    translucent: {
      light: 'rgba(0,0,0,0.12)',
      dark: 'rgba(255,255,255,0.12)',
    },
    opaque: {
      light: '#E5E5E5',
      dark: '#2E2E2E',
    },
  },
} as const;

/** Secondary gray — labels, inactive tabs */
export const neutral = {
  secondaryLabel: '#8E8E93',
} as const;

export const textPrimary = {
  ios: { light: '#000000', dark: '#FFFFFF' },
  android: { light: '#111111', dark: '#FFFFFF' },
} as const;

export const labels = {
  tertiary: {
    ios: { light: '#C7C7CC', dark: '#636366' },
    android: { light: '#ABABAB', dark: '#757575' },
  },
} as const;

/** Accent / interactive blues */
export const brand = {
  tint: {
    ios: { light: '#007AFF', dark: '#0A84FF' },
    android: { light: '#1B72E8', dark: '#4C8DFF' },
  },
  tintMuted: {
    ios: {
      light: 'rgba(0,122,255,0.12)',
      dark: 'rgba(10,132,255,0.18)',
    },
    android: {
      light: 'rgba(27,114,232,0.1)',
      dark: 'rgba(76,141,255,0.16)',
    },
  },
} as const;

/** Success / danger / warning */
export const semantic = {
  positive: {
    ios: { light: '#34C759', dark: '#30D158' },
    android: { light: '#2E7D32', dark: '#66BB6A' },
  },
  positiveSoft: {
    ios: {
      light: 'rgba(52,199,89,0.12)',
      dark: 'rgba(48,209,88,0.16)',
    },
    android: {
      light: 'rgba(46,125,50,0.1)',
      dark: 'rgba(102,187,106,0.16)',
    },
  },
  negative: {
    ios: { light: '#FF3B30', dark: '#FF453A' },
    android: { light: '#C62828', dark: '#EF5350' },
  },
  negativeSoft: {
    ios: {
      light: 'rgba(255,59,48,0.10)',
      dark: 'rgba(255,69,58,0.16)',
    },
    android: {
      light: 'rgba(198,40,40,0.08)',
      dark: 'rgba(239,83,80,0.16)',
    },
  },
  warning: {
    ios: { light: '#FF9500', dark: '#FF9F0A' },
    android: { light: '#E65100', dark: '#FFB74D' },
  },
  warningSoft: {
    ios: {
      light: 'rgba(255,149,0,0.10)',
      dark: 'rgba(255,159,10,0.16)',
    },
    android: {
      light: 'rgba(230,81,0,0.08)',
      dark: 'rgba(255,183,77,0.16)',
    },
  },
} as const;

export const surfaces = {
  ios: {
    bg: { light: '#F2F2F7', dark: '#000000' },
    elevated: { light: '#FFFFFF', dark: '#1C1C1E' },
    raised: { light: '#FFFFFF', dark: '#2C2C2E' },
  },
  android: {
    bg: { light: '#F6F6F6', dark: '#121212' },
    elevated: { light: '#FFFFFF', dark: '#1E1E1E' },
    raised: { light: '#FFFFFF', dark: '#252525' },
  },
} as const;

/** Static chroma accents for gradient glass cards (not tied to semantic money colors) */
export const decorativeGlassCard = {
  aurora: {
    light: {
      borderColors: ['#0EA5E9', '#6366F1', '#A855F7'] as const,
      glowColors: ['rgba(14,165,233,0.22)', 'rgba(99,102,241,0.12)', 'transparent'] as const,
    },
    dark: {
      borderColors: ['#22D3EE', '#818CF8', '#C084FC'] as const,
      glowColors: ['rgba(34,211,238,0.38)', 'rgba(129,140,248,0.2)', 'transparent'] as const,
    },
  },
  dual: {
    light: {
      borderColors: ['#22C55E', '#F59E0B', '#F43F5E'] as const,
      glowColors: ['rgba(34,197,94,0.2)', 'rgba(245,158,11,0.1)', 'transparent'] as const,
    },
    dark: {
      borderColors: ['#4ADE80', '#FBBF24', '#FB7185'] as const,
      glowColors: ['rgba(74,222,128,0.32)', 'rgba(251,191,36,0.14)', 'transparent'] as const,
    },
  },
  pulse: {
    light: {
      borderColors: ['#D946EF', '#8B5CF6', '#3B82F6'] as const,
      glowColors: ['rgba(217,70,239,0.2)', 'rgba(139,92,246,0.12)', 'transparent'] as const,
    },
    dark: {
      borderColors: ['#F472B6', '#A78BFA', '#60A5FA'] as const,
      glowColors: ['rgba(244,114,182,0.34)', 'rgba(167,139,250,0.18)', 'transparent'] as const,
    },
  },
} as const;
