// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navigation
  'house.fill': 'home',
  'bell.fill': 'notifications',
  'person.fill': 'person',
  'doc.text.fill': 'receipt-long',
  // Actions
  'plus': 'add',
  'xmark': 'close',
  'trash': 'delete',
  'checkmark': 'check',
  'checkmark.circle.fill': 'check-circle',
  'pencil': 'edit',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  // Misc (keeping originals)
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name] ?? 'help-outline'}
      style={style}
    />
  );
}
