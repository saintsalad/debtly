import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/lib/platform';

interface ListDividerProps {
  style?: StyleProp<ViewStyle>;
  bleedHorizontal?: number;
}

export function ListDivider({ style, bleedHorizontal = 0 }: ListDividerProps) {
  const palette = useColors();

  return (
    <View
      style={[
        styles.divider,
        bleedHorizontal > 0 && { marginHorizontal: -bleedHorizontal },
        { backgroundColor: palette.separator },
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
