import React, { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius } from '@/lib/platform';
import { type GlassCardAccent, useGlassCardAccent } from '@/lib/cardGradientAccent';
import { useGlassCardShadow, useGlassSurface } from '@/lib/glassSurface';
import type { GlassBorderVariant } from '@/lib/glassBorder';

const ACCENT_BORDER_WIDTH = 2;

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  glassVariant?: GlassBorderVariant;
  /** Vibrant gradient rim + corner glow (home accents). */
  accent?: GlassCardAccent;
}

function splitCardStyle(style: StyleProp<ViewStyle>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const {
    padding,
    paddingHorizontal,
    paddingVertical,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    alignItems,
    justifyContent,
    alignContent,
    alignSelf,
    gap,
    rowGap,
    columnGap,
    ...shellStyle
  } = flat;

  const contentStyle: ViewStyle = {
    padding,
    paddingHorizontal,
    paddingVertical,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    alignItems,
    justifyContent,
    alignContent,
    alignSelf,
    gap,
    rowGap,
    columnGap,
  };

  return { shellStyle, contentStyle };
}

/** Grouped card for gradient tab screens — frosted in dark mode, solid surface in light. */
export function GlassCard({
  children,
  style,
  borderRadius = radius.lg,
  glassVariant = 'surface',
  accent,
}: GlassCardProps) {
  const surface = useGlassSurface(glassVariant);
  const shadow = useGlassCardShadow();
  const accentConfig = useGlassCardAccent(accent);
  const { shellStyle, contentStyle } = useMemo(() => splitCardStyle(style), [style]);
  const innerRadius = borderRadius - ACCENT_BORDER_WIDTH;

  if (!accentConfig) {
    return (
      <View style={[{ borderRadius, overflow: 'hidden' }, surface, shadow, style]}>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={accentConfig.borderColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius, padding: ACCENT_BORDER_WIDTH }, shellStyle, shadow]}
    >
        <View
          style={[
            surface,
            { borderRadius: innerRadius, overflow: 'hidden' },
            contentStyle,
          ]}
        >
          <LinearGradient
            colors={accentConfig.glowColors}
            locations={[0, 0.45, 1]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
            style={styles.accentGlow}
          />
          {children}
        </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  accentGlow: {
    position: 'absolute',
    top: -48,
    right: -40,
    width: 168,
    height: 168,
  },
});
