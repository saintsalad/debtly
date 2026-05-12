import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, space, type, useColors, type ColorPalette } from '@/lib/platform';

interface PaymentProgressProps {
  paidLabel: string;
  remainingLabel: string;
  progress: number;
}

function createStyles(palette: ColorPalette) {
  return StyleSheet.create({
    container: {
      width: '100%',
      maxWidth: 280,
      gap: space[2],
    },
    track: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: palette.fill,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: palette.tint,
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: space[3],
    },
    label: {
      ...type.caption1,
      color: palette.labelSecondary,
    },
  });
}

export function PaymentProgress({ paidLabel, remainingLabel, progress }: PaymentProgressProps) {
  const palette = useColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }]} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.label}>{paidLabel}</Text>
        <Text style={styles.label}>{remainingLabel}</Text>
      </View>
    </View>
  );
}
