import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111827',
    background: '#F8F9FA',
    tint: '#007AFF',
    icon: '#6B7280',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#007AFF',
    card: '#FFFFFF',
    border: '#E5E7EB',
    muted: '#9CA3AF',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0F0F0F',
    tint: '#0A84FF',
    icon: '#9BA1A6',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#0A84FF',
    card: '#1C1C1E',
    border: '#2C2C2E',
    muted: '#8E8E93',
  },
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

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const DebtlyColors = {
  blue: '#007AFF',
  receivable: '#16A34A',
  receivableBg: '#F0FDF4',
  payable: '#DC2626',
  payableBg: '#FEF2F2',
  pending:  { bg: '#FFF8E1', text: '#D97706', dot: '#D97706' },
  paid:     { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A' },
  overdue:  { bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626' },
} as const;
