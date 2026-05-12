import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, useColors } from '@/lib/platform';

export type HeaderIconButtonVariant = 'secondary' | 'tint' | 'positive';

interface HeaderIconButtonProps {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: HeaderIconButtonVariant;
  iconSize?: number;
}

export function HeaderIconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  variant = 'secondary',
  iconSize = 20,
}: HeaderIconButtonProps) {
  const palette = useColors();

  const backgroundColor =
    variant === 'tint'
      ? palette.tint
      : variant === 'positive'
      ? palette.positiveSoft
      : palette.fill;

  const iconColor =
    variant === 'tint' ? '#fff' : variant === 'positive' ? palette.positive : palette.label;

  const rippleColor =
    variant === 'tint' ? 'rgba(255,255,255,0.25)' : palette.fill;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor }, pressed && styles.pressed]}
      android_ripple={{ color: rippleColor, borderless: true }}
    >
      <Icon size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
