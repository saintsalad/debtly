import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useGlassBorder, type GlassBorderVariant } from '@/lib/glassBorder';
import { radius, useColors } from '@/lib/platform';

export type HeaderIconButtonVariant = GlassBorderVariant;

interface HeaderIconButtonProps {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  onPressIn?: () => void;
  variant?: HeaderIconButtonVariant;
  iconSize?: number;
}

export function HeaderIconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  onPressIn,
  variant = 'secondary',
  iconSize = 20,
}: HeaderIconButtonProps) {
  const palette = useColors();
  const glassBorder = useGlassBorder(variant);

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
      onPressIn={onPressIn}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        glassBorder,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
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
