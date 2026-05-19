import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Image } from 'expo-image';
import { BanknoteArrowDown, BanknoteArrowUp } from 'lucide-react-native';
import { getDiceBearSvg } from '@/lib/dicebearAvatar';
import { sansForWeight } from '@/lib/appFonts';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { useColors } from '@/lib/platform';

export type AvatarTone = 'credit' | 'debit';

interface AvatarProps {
  name: string;
  /** When set (https or local file), shown instead of DiceBear / initials. Ignored when `tone` is set. */
  imageUri?: string | null;
  /** DiceBear only for individuals; use `initials` for groups / entities. */
  variant?: 'person' | 'initials';
  /** Stable DiceBear seed (e.g. member / debt id). Defaults to `name`. Ignored when `variant` is `initials`. */
  seed?: string;
  size?: number;
  tone?: AvatarTone;
  /** Softer fill + monochrome glyphs (archived buckets, settled rows). */
  muted?: boolean;
}

export function Avatar({
  name,
  imageUri,
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
    const iconColor = muted ? palette.labelSecondary : tone === 'credit' ? palette.positive : palette.negative;
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

  if (imageUri) {
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
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={160}
        />
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
  initialsText: { fontWeight: '700', fontFamily: sansForWeight('700'), letterSpacing: 0.5 },
});
