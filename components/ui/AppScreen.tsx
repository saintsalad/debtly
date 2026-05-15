import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ScreenBlueGradient } from '@/components/ui/ScreenBlueGradient';
import { layout, useColors } from '@/lib/platform';

interface AppScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `gradient` = tab-style blue background; `solid` = flat surface (e.g. modals). */
  background?: 'gradient' | 'solid';
  /**
   * Reserve space above the floating tab bar on Android.
   * Set false when the screen scroll view applies its own bottom inset.
   */
  reserveTabBarInset?: boolean;
}

export function AppScreen({
  children,
  style,
  background = 'gradient',
  reserveTabBarInset = Platform.OS !== 'ios',
}: AppScreenProps) {
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
      <View
        style={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === 'ios' || !reserveTabBarInset ? 0 : layout.screenPaddingBottom,
          },
        ]}
      >
        {children}
      </View>
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
  },
});
