import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { layout, useColors } from '@/lib/platform';

interface AppScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppScreen({ children, style }: AppScreenProps) {
  const palette = useColors();

  return (
    <View style={[styles.safe, { backgroundColor: palette.bg }, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    /** iOS: tab clearance comes from each screen’s scroll `contentContainerStyle`; see `docs/fixes/ios-tab-bottom-inset.md`. */
    paddingBottom: Platform.OS === 'ios' ? 0 : layout.screenPaddingBottom,
  },
});
