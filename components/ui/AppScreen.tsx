import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppHeader } from '@/components/ui/AppHeader';
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
      <AppHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: layout.screenPaddingBottom,
  },
});

export { useCollapsibleHeader } from '@/components/ui/collapsible-header-context';
