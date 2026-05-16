import { Platform } from 'react-native';

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

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
});
