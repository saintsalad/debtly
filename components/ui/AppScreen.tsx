import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/ui/AppHeader';
import { layout, useColors } from '@/lib/platform';

interface AppScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppScreen({ children, style }: AppScreenProps) {
  const palette = useColors();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }, style]} edges={['top']}>
      <AppHeader />
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
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
