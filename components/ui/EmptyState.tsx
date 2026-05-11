import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, space } from '@/lib/platform';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.label,
    textAlign: 'center',
    marginBottom: space[2],
  },
  subtitle: {
    ...type.subheadline,
    color: colors.labelSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
