import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { TransactionThermalReceipt } from '@/features/debts/receipt/TransactionThermalReceipt';
import {
  STORY_FRAME_HEIGHT,
  STORY_FRAME_WIDTH,
} from '@/features/debts/receipt/receiptTheme';
import type { Debt } from '@/features/debts/types';

const FRAME_PAD_V = 28;
const AVAILABLE_HEIGHT = STORY_FRAME_HEIGHT - FRAME_PAD_V * 2;

interface TransactionReceiptStoryFrameProps {
  debt: Debt;
  fmt: (amount: number) => string;
  backgroundColor: string;
  photoUri?: string | null;
}

/** Fixed 9:16 story canvas with receipt centered on the thermal scrim.
 *  Automatically scales the receipt down if its content is taller than the
 *  available canvas height so it always fits within the 9:16 ratio. */
export function TransactionReceiptStoryFrame({
  debt,
  fmt,
  backgroundColor,
  photoUri,
}: TransactionReceiptStoryFrameProps) {
  const [scale, setScale] = useState(1);

  function onReceiptLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setScale(Math.min(1, AVAILABLE_HEIGHT / h));
    }
  }

  return (
    <View style={[styles.frame, { backgroundColor }]}>
      <View
        onLayout={onReceiptLayout}
        style={[styles.receiptWrap, { transform: [{ scale }] }]}
      >
        <TransactionThermalReceipt
          debt={debt}
          fmt={fmt}
          backdropColor={backgroundColor}
          photoUri={photoUri}
        />
      </View>
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
    paddingVertical: FRAME_PAD_V,
  },
  receiptWrap: {
    transformOrigin: 'center',
  },
});
