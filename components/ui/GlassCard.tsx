import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '@/lib/platform';
import { useGlassCardShadow, useGlassSurface } from '@/lib/glassSurface';
import type { GlassBorderVariant } from '@/lib/glassBorder';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  glassVariant?: GlassBorderVariant;
}

/** Grouped card for gradient tab screens — frosted in dark mode, solid surface in light. */
export function GlassCard({
  children,
  style,
  borderRadius = radius.lg,
  glassVariant = 'surface',
}: GlassCardProps) {
  const surface = useGlassSurface(glassVariant);
  const shadow = useGlassCardShadow();

  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, surface, shadow, style]}>
      {children}
    </View>
  );
}
