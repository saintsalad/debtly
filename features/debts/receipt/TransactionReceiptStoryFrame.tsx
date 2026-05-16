import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TransactionThermalReceipt } from '@/features/debts/receipt/TransactionThermalReceipt';
import {
  STORY_FRAME_HEIGHT,
  STORY_FRAME_WIDTH,
} from '@/features/debts/receipt/receiptTheme';
import type { Debt } from '@/features/debts/types';

interface TransactionReceiptStoryFrameProps {
  debt: Debt;
  fmt: (amount: number) => string;
  backgroundColor: string;
  photoUri?: string | null;
}

/** Fixed 9:16 story canvas with receipt centered on the thermal scrim. */
export function TransactionReceiptStoryFrame({
  debt,
  fmt,
  backgroundColor,
  photoUri,
}: TransactionReceiptStoryFrameProps) {
  return (
    <View style={[styles.frame, { backgroundColor }]}>
      <View style={styles.dotTopLeft} />
      <View style={styles.dotBottomRight} />
      <View style={styles.dotMidRight} />
      <View style={styles.dotSoftCenter} />
      <TransactionThermalReceipt
        debt={debt}
        fmt={fmt}
        backdropColor={backgroundColor}
        photoUri={photoUri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: STORY_FRAME_WIDTH,
    height: STORY_FRAME_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dotTopLeft: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    top: -70,
    left: -50,
  },
  dotBottomRight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(236, 145, 151, 0.32)',
    bottom: -90,
    right: -90,
  },
  dotMidRight: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    top: 196,
    right: 22,
  },
  dotSoftCenter: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(247, 171, 177, 0.28)',
    bottom: 180,
    left: 36,
  },
});
