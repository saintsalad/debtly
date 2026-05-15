import React from 'react';
import { Button } from 'heroui-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { heroVariantToGlass, useGlassBorder, type GlassBorderVariant } from '@/lib/glassBorder';

type GlassButtonProps = React.ComponentProps<typeof Button> & {
  /** Override automatic variant → glass rim mapping. */
  glassVariant?: GlassBorderVariant;
  style?: StyleProp<ViewStyle>;
};

function GlassButtonRoot({ glassVariant, style, variant, ...props }: GlassButtonProps) {
  const border = useGlassBorder(glassVariant ?? heroVariantToGlass(variant));

  return <Button {...props} variant={variant} style={[border, style]} />;
}

export const GlassButton = Object.assign(GlassButtonRoot, {
  Label: Button.Label,
});
