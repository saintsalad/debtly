import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Image as SvgImage } from 'react-native-svg';
import {
  RECEIPT_MUTED,
  RECEIPT_PHOTO_DISPLAY_HEIGHT,
  RECEIPT_PHOTO_DISPLAY_WIDTH,
} from '@/features/debts/receipt/receiptTheme';

interface ReceiptImageContainerProps {
  uri: string;
}

/**
 * Dashed thermal frame; image is center-cropped (`slice`) into the slot matching
 * {@link RECEIPT_PHOTO_CROP_ASPECT} from the picker on Android.
 * Renders full color so thermal / bitmap-lab palette tints are visible (no grayscale matrix).
 */
export function ReceiptImageContainer({ uri }: ReceiptImageContainerProps) {
  const w = RECEIPT_PHOTO_DISPLAY_WIDTH;
  const h = RECEIPT_PHOTO_DISPLAY_HEIGHT;

  return (
    <View style={styles.frame}>
      <Svg width={w} height={h}>
        <SvgImage
          href={uri}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid slice"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: RECEIPT_PHOTO_DISPLAY_HEIGHT,
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: RECEIPT_MUTED,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#ECECEC',
  },
});
