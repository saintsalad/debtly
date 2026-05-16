import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TransactionThermalReceipt } from '@/features/debts/receipt/TransactionThermalReceipt';
import {
  RECEIPT_SCRIM,
  STORY_FRAME_HEIGHT,
  STORY_FRAME_WIDTH,
} from '@/features/debts/receipt/receiptTheme';
import type { Debt } from '@/features/debts/types';

interface TransactionReceiptStoryFrameProps {
  debt: Debt;
  fmt: (amount: number) => string;
}

/** Fixed 9:16 story canvas with receipt centered on the thermal scrim. */
export function TransactionReceiptStoryFrame({ debt, fmt }: TransactionReceiptStoryFrameProps) {
  return (
    <View style={styles.frame}>
      <TransactionThermalReceipt debt={debt} fmt={fmt} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: STORY_FRAME_WIDTH,
    height: STORY_FRAME_HEIGHT,
    backgroundColor: RECEIPT_SCRIM,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
