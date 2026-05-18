import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ThermalReceiptSlip } from '@/features/debts/receipt/ThermalReceiptSlip';
import type { ReceiptCanvasBackground, ReceiptCanvasGradient } from '@/features/debts/receipt/receiptCanvasPresets';
import {
  getReceiptTiltDegrees,
  STORY_FRAME_HEIGHT,
  STORY_FRAME_WIDTH,
} from '@/features/debts/receipt/receiptTheme';
import type { TransactionReceiptData } from '@/features/debts/receipt/transactionReceiptData';

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

interface ReceiptStoryFrameProps {
  receiptData: TransactionReceiptData;
  tiltSeed: string;
  canvasBackground: ReceiptCanvasBackground;
  backgroundImageUri?: string | null;
  photoUri?: string | null;
  frameWidth?: number;
  frameHeight?: number;
}

/** Canvas with framed thermal slip (story export presets, optional photo). */
export function ReceiptStoryFrame({
  receiptData,
  tiltSeed,
  canvasBackground,
  backgroundImageUri,
  photoUri,
  frameWidth = STORY_FRAME_WIDTH,
  frameHeight = STORY_FRAME_HEIGHT,
}: ReceiptStoryFrameProps) {
  const [scale, setScale] = useState(1);
  const tiltDeg = useMemo(() => getReceiptTiltDegrees(tiltSeed), [tiltSeed]);
  const availableHeight = frameHeight - FRAME_PAD_V * 2;

  function onReceiptLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setScale(Math.min(1, availableHeight / h));
    }
  }

  return (
    <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
      {backgroundImageUri ? (
        <>
          <Image
            source={{ uri: backgroundImageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={styles.backgroundPhotoScrim} pointerEvents="none" />
        </>
      ) : (
        <ReceiptCanvasFill spec={canvasBackground} />
      )}
      <View
        onLayout={onReceiptLayout}
        style={[styles.receiptWrap, { transform: [{ scale }, { rotate: `${tiltDeg}deg` }] }]}
      >
        <ThermalReceiptSlip data={receiptData} photoUri={photoUri} />
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
  backgroundPhotoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  receiptWrap: {
    transformOrigin: 'center',
    zIndex: 1,
  },
});
