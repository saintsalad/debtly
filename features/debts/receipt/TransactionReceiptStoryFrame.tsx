import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TransactionThermalReceipt } from '@/features/debts/receipt/TransactionThermalReceipt';
import type { ReceiptCanvasBackground, ReceiptCanvasGradient } from '@/features/debts/receipt/receiptCanvasPresets';
import {
  getReceiptTiltDegrees,
  STORY_FRAME_HEIGHT,
  STORY_FRAME_WIDTH,
} from '@/features/debts/receipt/receiptTheme';
import type { Debt } from '@/features/debts/types';

const FRAME_PAD_V = 28;

function ReceiptCanvasFill({ spec }: { spec: ReceiptCanvasBackground }) {
  if (spec.kind === 'solid') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: spec.color }]} />;
  }
  const g = spec as ReceiptCanvasGradient;
  return (
    <LinearGradient
      style={StyleSheet.absoluteFill}
      colors={[...g.colors]}
      locations={g.locations ? ([...g.locations] as [number, number, ...number[]]) : undefined}
      start={g.start}
      end={g.end}
    />
  );
}

interface TransactionReceiptStoryFrameProps {
  debt: Debt;
  fmt: (amount: number) => string;
  canvasBackground: ReceiptCanvasBackground;
  photoUri?: string | null;
  /** Preview/capture size (logical). Defaults to 360×640 story frame. */
  frameWidth?: number;
  frameHeight?: number;
}

/** Fixed 9:16 story canvas with receipt centered on the thermal scrim.
 *  Automatically scales the receipt down if its content is taller than the
 *  available canvas height so it always fits within the 9:16 ratio. */
export function TransactionReceiptStoryFrame({
  debt,
  fmt,
  canvasBackground,
  photoUri,
  frameWidth = STORY_FRAME_WIDTH,
  frameHeight = STORY_FRAME_HEIGHT,
}: TransactionReceiptStoryFrameProps) {
  const [scale, setScale] = useState(1);
  const tiltDeg = useMemo(() => getReceiptTiltDegrees(debt.id), [debt.id]);
  const availableHeight = frameHeight - FRAME_PAD_V * 2;

  function onReceiptLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setScale(Math.min(1, availableHeight / h));
    }
  }

  return (
    <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
      <ReceiptCanvasFill spec={canvasBackground} />
      <View
        onLayout={onReceiptLayout}
        style={[styles.receiptWrap, { transform: [{ scale }, { rotate: `${tiltDeg}deg` }] }]}
      >
        <TransactionThermalReceipt debt={debt} fmt={fmt} photoUri={photoUri} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingVertical: FRAME_PAD_V,
  },
  receiptWrap: {
    transformOrigin: 'center',
    zIndex: 1,
  },
});
