import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

const TOOTH_WIDTH = 10;
const TOOTH_DEPTH = 8;

function buildTearPath(width: number): string {
  const parts: string[] = ['M 0 0'];
  for (let x = 0; x < width; x += TOOTH_WIDTH) {
    const mid = Math.min(x + TOOTH_WIDTH / 2, width);
    const end = Math.min(x + TOOTH_WIDTH, width);
    parts.push(`L ${mid} ${TOOTH_DEPTH}`);
    parts.push(`L ${end} 0`);
  }
  parts.push(`L ${width} ${TOOTH_DEPTH}`);
  parts.push('L 0 0');
  parts.push('Z');
  return parts.join(' ');
}

interface ReceiptTearEdgeProps {
  width: number;
  color?: string;
}

export function ReceiptTearEdge({ width, color = '#FFFFFF' }: ReceiptTearEdgeProps) {
  const d = useMemo(() => buildTearPath(width), [width]);
  const height = TOOTH_DEPTH;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={d} fill={color} />
    </Svg>
  );
}
