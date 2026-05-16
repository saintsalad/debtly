import { createAvatar } from '@dicebear/core';
import * as thumbs from '@dicebear/thumbs';

const cache = new Map<string, string>();

function rasterPixels(layoutSize: number): number {
  return Math.min(256, Math.max(72, Math.ceil(layoutSize * 2.25)));
}

/** Deterministic DiceBear (thumbs) SVG for Expo / RN via `react-native-svg` SvgXml. */
export function getDiceBearSvg(seed: string, layoutSize: number): string {
  const safe = seed.trim() || '?';
  const raster = rasterPixels(layoutSize);
  const key = `${safe}\0${raster}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const svg = createAvatar(thumbs, {
    seed: safe,
    size: raster,
  }).toString();
  cache.set(key, svg);
  return svg;
}
