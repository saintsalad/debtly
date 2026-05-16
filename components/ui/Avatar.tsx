import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BanknoteArrowDown, BanknoteArrowUp } from 'lucide-react-native';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { useColors } from '@/lib/platform';

export type AvatarTone = 'credit' | 'debit';

interface AvatarProps {
  name: string;
  size?: number;
  tone?: AvatarTone;
}

export function Avatar({ name, size = 44, tone }: AvatarProps) {
  const palette = useColors();

  const bg =
    tone === 'credit'
      ? palette.positiveSoft
      : tone === 'debit'
        ? palette.negativeSoft
        : getAvatarColor(name);

  const iconColor =
    tone === 'credit'
      ? palette.positive
      : tone === 'debit'
        ? palette.negative
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
