import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BanknoteArrowDown, BanknoteArrowUp } from 'lucide-react-native';
import { getDiceBearSvg } from '@/lib/dicebearAvatar';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { useColors } from '@/lib/platform';

export type AvatarTone = 'credit' | 'debit';

interface AvatarProps {
  name: string;
  /** DiceBear only for individuals; use `initials` for groups / entities. */
  variant?: 'person' | 'initials';
  /** Stable DiceBear seed (e.g. member / debt id). Defaults to `name`. Ignored when `variant` is `initials`. */
  seed?: string;
  size?: number;
  tone?: AvatarTone;
  /** Softer fill + monochrome arrows for archived / low-emphasis lists. */
  muted?: boolean;
}

export function Avatar({
  name,
  variant = 'person',
  seed,
  size = 44,
  tone,
  muted = false,
}: AvatarProps) {
  const palette = useColors();
  const avatarSeed = seed ?? name;

  if (tone === 'credit' || tone === 'debit') {
    const bg = muted ? palette.fillSecondary : tone === 'credit' ? palette.positiveSoft : palette.negativeSoft;
    const iconColor = muted ? palette.labelTertiary : tone === 'credit' ? palette.positive : palette.negative;
    const iconSize = Math.round(size * 0.45);

    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        ]}
        accessibilityRole="image"
        accessibilityLabel={name}
      >
        {tone === 'credit' ? (
          <BanknoteArrowDown size={iconSize} color={iconColor} strokeWidth={2.25} />
        ) : (
          <BanknoteArrowUp size={iconSize} color={iconColor} strokeWidth={2.25} />
        )}
      </View>
    );
  }

  if (variant === 'initials') {
    const bg = getAvatarColor(name);
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        ]}
        accessibilityRole="image"
        accessibilityLabel={name}
      >
        <Text style={[styles.initialsText, { fontSize: size * 0.36, color: '#fff' }]}>
          {getInitials(name)}
        </Text>
      </View>
    );
  }

  const svg = getDiceBearSvg(avatarSeed, size);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: palette.fill,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontWeight: '700', letterSpacing: 0.5 },
});
