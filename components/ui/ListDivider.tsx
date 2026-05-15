import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useGlassSeparatorColor } from '@/lib/glassSurface';
import { useColors } from '@/lib/platform';

interface ListDividerProps {
  style?: StyleProp<ViewStyle>;
  bleedHorizontal?: number;
  /** `glass` = subtle divider on frosted cards (tab screens). */
  variant?: 'default' | 'glass';
}

export function ListDivider({ style, bleedHorizontal = 0, variant = 'default' }: ListDividerProps) {
  const palette = useColors();
  const glassSeparator = useGlassSeparatorColor();

  return (
    <View
      style={[
        styles.divider,
        bleedHorizontal > 0 && { marginHorizontal: -bleedHorizontal },
        {
          backgroundColor: variant === 'glass' ? glassSeparator : palette.separator,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
