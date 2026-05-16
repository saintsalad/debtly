import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

/** Preferred scallop period; count is adjusted so segments divide draw width evenly. */
export const RECEIPT_TEAR_TOOTH_WIDTH = 16;
export const RECEIPT_TEAR_TOOTH_DEPTH = 8;

const IS_ANDROID = Platform.OS === 'android';

/** Paper draws over the tear strip by this much to hide Android sub-pixel seams. */
export const RECEIPT_TEAR_PAPER_OVERLAP = IS_ANDROID ? 2 : 0;

/** iOS-only negative margin on the tear strip. */
const TEAR_SEAM_OVERLAP = IS_ANDROID ? 0 : 0.5;

/** White band inside the SVG above scallops (Android anti-aliasing gap). */
const TEAR_TOP_SEAL = IS_ANDROID ? RECEIPT_TEAR_PAPER_OVERLAP : 0;

export interface TearLayout {
  count: number;
  segmentWidth: number;
}

export function getTearLayout(
  totalWidth: number,
  preferredToothWidth = RECEIPT_TEAR_TOOTH_WIDTH
): TearLayout {
  const count = Math.max(1, Math.round(totalWidth / preferredToothWidth));
  return { count, segmentWidth: totalWidth / count };
}

function getTearSegmentBounds(
  totalWidth: number,
  count: number,
  index: number
): { start: number; end: number } {
  const start = (totalWidth * index) / count;
  const end = index === count - 1 ? totalWidth : (totalWidth * (index + 1)) / count;
  return { start, end };
}

/** Classic V-shaped perforation (iOS). */
function buildIosZigzagPath(width: number, toothWidth: number, toothDepth: number): string {
  const subpaths: string[] = [];
  const count = Math.max(1, Math.round(width / toothWidth));
  const segmentWidth = width / count;

  for (let i = 0; i < count; i++) {
    const x = i * segmentWidth;
    const endX = i === count - 1 ? width : (width * (i + 1)) / count;
    const peakX = x + (endX - x) / 2;
    if (peakX <= x) continue;

    subpaths.push(`M ${x} 0 L ${peakX} ${toothDepth} L ${endX} 0 Z`);
  }

  return subpaths.join(' ');
}

function buildCurvedTearPath(drawWidth: number, count: number, toothDepth: number): string {
  const subpaths: string[] = [];

  for (let i = 0; i < count; i++) {
    const { start, end } = getTearSegmentBounds(drawWidth, count, i);
    const segmentW = end - start;
    if (segmentW <= 0.5) continue;

    const midX = start + segmentW / 2;
    subpaths.push(`M ${start} 0 Q ${midX} ${toothDepth} ${end} 0 Z`);
  }

  return subpaths.join(' ');
}

interface ReceiptTearEdgeProps {
  width: number;
  color?: string;
  /** Fills valleys between paper teeth / scallops (story scrim). */
  backdropColor?: string;
}

export function ReceiptTearEdge({
  width,
  color = '#FFFFFF',
  backdropColor = 'transparent',
}: ReceiptTearEdgeProps) {
  const drawWidth = width;
  const layout = useMemo(() => getTearLayout(drawWidth), [drawWidth]);
  const svgHeight = RECEIPT_TEAR_TOOTH_DEPTH + TEAR_TOP_SEAL;

  const d = useMemo(() => {
    if (IS_ANDROID) {
      return buildCurvedTearPath(drawWidth, layout.count, RECEIPT_TEAR_TOOTH_DEPTH);
    }
    return buildIosZigzagPath(drawWidth, layout.segmentWidth, RECEIPT_TEAR_TOOTH_DEPTH);
  }, [drawWidth, layout.count, layout.segmentWidth]);

  return (
    <View
      collapsable={false}
      style={[
        styles.strip,
        IS_ANDROID ? styles.stripAndroid : styles.stripIos,
        {
          width: drawWidth,
          height: RECEIPT_TEAR_TOOTH_DEPTH,
          marginTop: -TEAR_SEAM_OVERLAP,
          backgroundColor: backdropColor,
        },
      ]}
    >
      <Svg
        width={drawWidth}
        height={svgHeight}
        viewBox={`0 ${-TEAR_TOP_SEAL} ${drawWidth} ${svgHeight}`}
        pointerEvents="none"
      >
        {TEAR_TOP_SEAL > 0 ? (
          <Rect x={0} y={-TEAR_TOP_SEAL} width={drawWidth} height={TEAR_TOP_SEAL} fill={color} />
        ) : null}
        <Path d={d} fill={color} fillRule="nonzero" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignSelf: 'stretch',
  },
  stripIos: {
    overflow: 'hidden',
  },
  stripAndroid: {
    overflow: 'visible',
  },
});
