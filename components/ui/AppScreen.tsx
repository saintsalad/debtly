import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ScreenBlueGradient } from '@/components/ui/ScreenBlueGradient';
import { layout, useColors } from '@/lib/platform';

interface AppScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `gradient` = tab-style blue background; `solid` = flat surface (e.g. modals). */
  background?: 'gradient' | 'solid';
}

export function AppScreen({ children, style, background = 'gradient' }: AppScreenProps) {
  const palette = useColors();
  const useGradient = background === 'gradient';

  return (
    <View
      style={[
        styles.safe,
        { backgroundColor: useGradient ? 'transparent' : palette.bg },
        style,
      ]}
    >
      {useGradient ? <ScreenBlueGradient /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    /** iOS: tab clearance comes from each screen’s scroll `contentContainerStyle`; see `docs/fixes/ios-tab-bottom-inset.md`. */
    paddingBottom: Platform.OS === 'ios' ? 0 : layout.screenPaddingBottom,
  },
});
