import { Buffer as BufferPolyfill } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as typeof globalThis & { Buffer: typeof BufferPolyfill }).Buffer =
    BufferPolyfill;
}

import * as jpeg from 'jpeg-js';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export type PixelShape = 'square' | 'circle-solid' | 'circle-outline';
/** `color` = bitmap dither while keeping per-cell hues from the source image. */
export type ColorMode = 'duotone' | 'tritone' | 'color';

export interface ThermalizeOptions {
  pixelSize: number;
  contrast: number;
  intensity: number;
  pixelShape?: PixelShape;
  /** Foreground (dark) color [r,g,b]. */
  fgColor?: [number, number, number];
  /** Background (light) color [r,g,b]. */
  bgColor?: [number, number, number];
  /** Mid-tone [r,g,b] — only when colorMode is 'tritone'. */
  midColor?: [number, number, number];
  colorMode?: ColorMode;
}

export const DEFAULT_THERMALIZE_OPTIONS: ThermalizeOptions = {
  pixelSize: 3,
  contrast: 1.2,
  intensity: 0.45,
  pixelShape: 'square',
  colorMode: 'duotone',
  fgColor: [28, 28, 28],
  bgColor: [255, 255, 255],
};

/** Returns true if pixel at (lx, ly) within a cell of size (cw, ch) is inside the pixel shape. */
function inPixelShape(
  lx: number,
  ly: number,
  cw: number,
  ch: number,
  shape: PixelShape,
): boolean {
  if (shape === 'square') return true;
  const cx = (cw - 1) / 2;
  const cy = (ch - 1) / 2;
  const dx = (lx - cx) / (cx + 0.5);
  const dy = (ly - cy) / (cy + 0.5);
  const d2 = dx * dx + dy * dy;
  if (shape === 'circle-solid') return d2 <= 1;
  return d2 <= 1 && d2 >= 0.36;
}

function grayToColor(
  raw: number,
  fg: [number, number, number],
  bg: [number, number, number],
  mid: [number, number, number] | undefined,
  colorMode: ColorMode,
): [number, number, number] {
  if (colorMode === 'tritone' && mid) {
    if (raw < 85) return fg;
    if (raw < 170) return mid;
    return bg;
  }
  return raw <= 127 ? fg : bg;
}

/** Dither output (0/255) mapped to two tones that preserve the cell's chroma. */
function colorBitmapTones(
  r: number,
  g: number,
  b: number,
  lumaQuantized: number,
): [number, number, number] {
  const cr = Math.max(0, Math.min(255, r));
  const cg = Math.max(0, Math.min(255, g));
  const cb = Math.max(0, Math.min(255, b));
  if (lumaQuantized <= 127) {
    const k = 0.42;
    return [cr * k, cg * k, cb * k];
  }
  const lift = 0.62;
  return [
    cr + (255 - cr) * lift,
    cg + (255 - cg) * lift,
    cb + (255 - cb) * lift,
  ];
}

export function thermalizeRgba(
  src: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  opts: ThermalizeOptions,
): Uint8Array {
  const { pixelSize, contrast, intensity } = opts;
  const fg = opts.fgColor ?? [28, 28, 28];
  const bg = opts.bgColor ?? [255, 255, 255];
  const mid = opts.midColor;
  const colorMode = opts.colorMode ?? 'duotone';
  const pixelShape = opts.pixelShape ?? 'square';

  const data = src instanceof Uint8Array ? src : new Uint8Array(src);
  const out = new Uint8Array(width * height * 4);

  const bw = Math.max(2, Math.floor(width / Math.max(1, pixelSize)));
  const bh = Math.max(2, Math.floor(height / Math.max(1, pixelSize)));
  const grid = new Float32Array(bw * bh);
  const cellR = new Float32Array(bw * bh);
  const cellG = new Float32Array(bw * bh);
  const cellB = new Float32Array(bw * bh);

  for (let gy = 0; gy < bh; gy++) {
    for (let gx = 0; gx < bw; gx++) {
      const x0 = Math.floor((gx * width) / bw);
      const x1 = Math.floor(((gx + 1) * width) / bw);
      const y0 = Math.floor((gy * height) / bh);
      const y1 = Math.floor(((gy + 1) * height) / bh);
      let lumSum = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          const rp = data[i] ?? 0;
          const gp = data[i + 1] ?? 0;
          const bp = data[i + 2] ?? 0;
          sumR += rp;
          sumG += gp;
          sumB += bp;
          lumSum += 0.299 * rp + 0.587 * gp + 0.114 * bp;
          count++;
        }
      }
      const ci = gy * bw + gx;
      if (count) {
        cellR[ci] = sumR / count;
        cellG[ci] = sumG / count;
        cellB[ci] = sumB / count;
        let gray = lumSum / count;
        gray = (gray - 128) * contrast + 128;
        grid[ci] = Math.max(0, Math.min(255, gray));
      } else {
        cellR[ci] = 255;
        cellG[ci] = 255;
        cellB[ci] = 255;
        grid[ci] = 255;
      }
    }
  }

  const processed =
    colorMode === 'tritone'
      ? grid
      : intensity > 0.04
        ? floydSteinbergGrid(grid, bw, bh, intensity)
        : quantizeGrid(grid, bw, bh);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = Math.min(bw - 1, Math.floor((x / width) * bw));
      const gy = Math.min(bh - 1, Math.floor((y / height) * bh));

      const x0 = Math.floor((gx * width) / bw);
      const x1 = Math.floor(((gx + 1) * width) / bw);
      const y0 = Math.floor((gy * height) / bh);
      const y1 = Math.floor(((gy + 1) * height) / bh);
      const cw = Math.max(1, x1 - x0);
      const ch = Math.max(1, y1 - y0);
      const lx = x - x0;
      const ly = y - y0;

      const ci = gy * bw + gx;
      const raw = processed[ci] ?? 0;
      const i = (y * width + x) * 4;

      const inside = inPixelShape(lx, ly, cw, ch, pixelShape);

      let color: [number, number, number];
      if (colorMode === 'color') {
        const cr = cellR[ci] ?? 255;
        const cg = cellG[ci] ?? 255;
        const cb = cellB[ci] ?? 255;
        color = inside ? colorBitmapTones(cr, cg, cb, raw) : colorBitmapTones(cr, cg, cb, 255);
      } else if (inside) {
        color = grayToColor(raw, fg, bg, mid, colorMode);
      } else {
        color = bg;
      }

      out[i] = color[0];
      out[i + 1] = color[1];
      out[i + 2] = color[2];
      out[i + 3] = 255;
    }
  }
  return out;
}

function quantizeGrid(g: Float32Array, w: number, h: number): Float32Array {
  const o = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) {
    o[i] = (g[i] ?? 0) >= 128 ? 255 : 0;
  }
  return o;
}

function floydSteinbergGrid(
  g: Float32Array,
  w: number,
  h: number,
  strength: number,
): Float32Array {
  const out = Float32Array.from(g);
  const s = Math.max(0, Math.min(1, strength));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = out[i] ?? 0;
      const quantized = old >= 128 ? 255 : 0;
      const err = (old - quantized) * s;
      out[i] = quantized;
      if (x + 1 < w) out[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) out[i + w - 1] += (err * 3) / 16;
        out[i + w] += (err * 5) / 16;
        if (x + 1 < w) out[i + w + 1] += (err * 1) / 16;
      }
    }
  }
  return out;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(bin);
}

function encodeBytesFromJpegEncode(result: unknown): Uint8Array {
  if (result instanceof Uint8Array) return result;
  if (result && typeof result === 'object' && 'data' in result) {
    const d = (result as { data: unknown }).data;
    if (d instanceof Uint8Array) return d;
  }
  const buf = result as { buffer?: ArrayBuffer; byteOffset?: number; byteLength?: number };
  if (buf?.buffer && typeof buf.byteLength === 'number') {
    return new Uint8Array(buf.buffer, buf.byteOffset ?? 0, buf.byteLength);
  }
  throw new Error('jpeg encode: unexpected output');
}

/** Thermal-print look: dithered, blocky preview written to cache as JPEG. Returns file URI. */
export async function processThermalImage(
  sourceUri: string,
  opts: ThermalizeOptions,
): Promise<string> {
  const resizeW = Math.max(64, Math.min(480, Math.round(360 / Math.max(1, opts.pixelSize / 4))));
  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: resizeW } }],
    { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!result.base64) throw new Error('Image manipulator did not return base64');

  const binaryString = atob(result.base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  const { width, height, data } = decoded;
  if (!data || !width || !height) throw new Error('JPEG decode failed');

  const rgba = data instanceof Uint8Array ? data : new Uint8Array(data);
  const thermal = thermalizeRgba(rgba, width, height, opts);

  const encBytes = encodeBytesFromJpegEncode(jpeg.encode({ data: thermal, width, height }, 90));

  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error('No cache directory');
  const outPath = `${dir}debtly-thermal-${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(outPath, uint8ToBase64(encBytes), {
    encoding: 'base64',
  });
  return outPath;
}
