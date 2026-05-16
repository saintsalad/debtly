import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Matches classic thermal-receipt perforation (~16×16 CSS mask tiles). */
export const RECEIPT_TEAR_TOOTH_WIDTH = 16;
export const RECEIPT_TEAR_TOOTH_DEPTH = 8;

/**
 * Builds downward paper teeth (V-shaped zigzag) across the width.
 * Valleys sit on y=0; peaks point down to toothDepth.
 */
function buildTearTeethPath(width: number, toothWidth: number, toothDepth: number): string {
  const half = toothWidth / 2;
  const subpaths: string[] = [];

  for (let x = 0; x < width; x += toothWidth) {
    const peakX = Math.min(x + half, width);
    const endX = Math.min(x + toothWidth, width);
    if (peakX <= x) continue;

    subpaths.push(`M ${x} 0 L ${peakX} ${toothDepth} L ${endX} 0 Z`);
  }

  return subpaths.join(' ');
}

interface ReceiptTearEdgeProps {
  width: number;
  color?: string;
  /** Shows through zigzag valleys between paper teeth. */
  backdropColor?: string;
}

export function ReceiptTearEdge({
  width,
  color = '#FFFFFF',
  backdropColor = 'transparent',
}: ReceiptTearEdgeProps) {
  const d = useMemo(
    () => buildTearTeethPath(width, RECEIPT_TEAR_TOOTH_WIDTH, RECEIPT_TEAR_TOOTH_DEPTH),
    [width]
  );

  return (
    <View
      style={[
        styles.strip,
        {
          width,
          height: RECEIPT_TEAR_TOOTH_DEPTH,
          backgroundColor: backdropColor,
        },
      ]}
    >
      <Svg
        width={width}
        height={RECEIPT_TEAR_TOOTH_DEPTH}
        viewBox={`0 0 ${width} ${RECEIPT_TEAR_TOOTH_DEPTH}`}
      >
        <Path d={d} fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    overflow: 'hidden',
  },
});
