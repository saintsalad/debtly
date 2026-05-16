import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, space, type, useColors } from '@/lib/platform';

interface ReceiptCircleButtonProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'primary';
}

const SIZE = 56;

export function ReceiptCircleButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'default',
}: ReceiptCircleButtonProps) {
  const palette = useColors();
  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? palette.tint : 'rgba(255, 255, 255, 0.12)';
  const borderColor = isPrimary ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.24)';
  const iconColor = isPrimary ? '#FFFFFF' : '#FFFFFF';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || loading }}
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor, borderColor },
          (pressed || disabled) && styles.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={iconColor} size="small" />
        ) : (
          <Icon size={22} color={iconColor} strokeWidth={2} />
        )}
      </Pressable>
      <Text style={styles.caption} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space[2],
    minWidth: 64,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.72,
  },
  caption: {
    ...type.caption2,
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
  },
});
