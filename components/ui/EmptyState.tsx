import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, type, space, type ColorPalette } from '@/lib/platform';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[12],
      paddingHorizontal: space[8],
    },
    iconWrap: { marginBottom: space[5] },
    title: {
      ...type.title3,
      color: palette.label,
      textAlign: 'center',
      marginBottom: space[2],
    },
    subtitle: {
      ...type.subheadline,
      color: palette.labelSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
}

export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
