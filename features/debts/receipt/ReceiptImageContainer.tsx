import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from 'react-native-svg';
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
 */
export function ReceiptImageContainer({ uri }: ReceiptImageContainerProps) {
  const w = RECEIPT_PHOTO_DISPLAY_WIDTH;
  const h = RECEIPT_PHOTO_DISPLAY_HEIGHT;

  return (
    <View style={styles.frame}>
      <Svg width={w} height={h}>
        <Defs>
          <Filter id="receiptGrayscale">
            <FeColorMatrix
              type="matrix"
              values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
            />
          </Filter>
        </Defs>
        <SvgImage
          href={uri}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid slice"
          filter="url(#receiptGrayscale)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    marginTop: 14,
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
