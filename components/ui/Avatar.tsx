import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BanknoteArrowDown, BanknoteArrowUp } from 'lucide-react-native';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { useColors } from '@/lib/platform';

export type AvatarTone = 'credit' | 'debit';
export type AvatarVariant = 'default' | 'muted';

interface AvatarProps {
  name: string;
  size?: number;
  tone?: AvatarTone;
  /** Muted styling for settled/paid rows; keeps credit/debit icon. */
  variant?: AvatarVariant;
}

export function Avatar({ name, size = 44, tone, variant = 'default' }: AvatarProps) {
  const palette = useColors();
  const muted = variant === 'muted';

  const bg = tone === 'credit'
    ? muted
      ? palette.fillSecondary
      : palette.positiveSoft
    : tone === 'debit'
      ? muted
        ? palette.fillSecondary
        : palette.negativeSoft
      : getAvatarColor(name);

  const iconColor = tone === 'credit'
    ? muted
      ? palette.labelSecondary
      : palette.positive
    : tone === 'debit'
      ? muted
        ? palette.labelSecondary
        : palette.negative
      : '#fff';

  const iconSize = Math.round(size * 0.45);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      {tone === 'credit' ? (
        <BanknoteArrowUp size={iconSize} color={iconColor} strokeWidth={2.25} />
      ) : tone === 'debit' ? (
        <BanknoteArrowDown size={iconSize} color={iconColor} strokeWidth={2.25} />
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.36, color: iconColor }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700', letterSpacing: 0.5 },
});
