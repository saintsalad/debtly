export type ReceiptCanvasSolid = { kind: 'solid'; color: string };

export type ReceiptCanvasGradient = {
  kind: 'gradient';
  colors: readonly [string, string, ...string[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
  locations?: readonly [number, number, ...number[]];
};

export type ReceiptCanvasBackground = ReceiptCanvasSolid | ReceiptCanvasGradient;

/** Vertical canvas gradients: first `color` = top, last = bottom (tear uses bottom). */
const V_TOP = { x: 0.5, y: 0 } as const;
const V_BOT = { x: 0.5, y: 1 } as const;

export const RECEIPT_CANVAS_PRESETS = [
  {
    id: 'black',
    label: 'Black',
    background: { kind: 'solid' as const, color: '#000000' },
  },
  {
    id: 'slate',
    label: 'Slate',
    background: { kind: 'solid' as const, color: '#1E293B' },
  },
  {
    id: 'navy',
    label: 'Navy',
    background: { kind: 'solid' as const, color: '#0F172A' },
  },
  {
    id: 'wine',
    label: 'Wine',
    background: { kind: 'solid' as const, color: '#3B0A1E' },
  },
  {
    id: 'forest',
    label: 'Forest',
    background: { kind: 'solid' as const, color: '#0D2818' },
  },
  {
    id: 'rose',
    label: 'Rose',
    background: { kind: 'solid' as const, color: '#F2D4D8' },
  },
  {
    id: 'mint',
    label: 'Mint',
    background: { kind: 'solid' as const, color: '#DDEEE7' },
  },
  {
    id: 'cream',
    label: 'Cream',
    background: { kind: 'solid' as const, color: '#F6ECDC' },
  },
  {
    id: 'lavender',
    label: 'Lavender',
    background: { kind: 'solid' as const, color: '#E8E0F5' },
  },
  {
    id: 'peach',
    label: 'Peach',
    background: { kind: 'solid' as const, color: '#FFE5D4' },
  },
  {
    id: 'sky',
    label: 'Sky',
    background: { kind: 'solid' as const, color: '#E0F2FE' },
  },
  {
    id: 'sand',
    label: 'Sand',
    background: { kind: 'solid' as const, color: '#EDE8D0' },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    background: {
      kind: 'gradient' as const,
      colors: ['#FF6B6B', '#FFB86B', '#FFE066'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.45, 1],
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    background: {
      kind: 'gradient' as const,
      colors: ['#0EA5E9', '#0369A1', '#0C4A6E'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.5, 1],
    },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    background: {
      kind: 'gradient' as const,
      colors: ['#22C55E', '#14B8A6', '#8B5CF6', '#EC4899'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.33, 0.66, 1],
    },
  },
  {
    id: 'dusk',
    label: 'Dusk',
    background: {
      kind: 'gradient' as const,
      colors: ['#4C1D95', '#312E81', '#1E1B4B'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.5, 1],
    },
  },
  {
    id: 'blush',
    label: 'Blush',
    background: {
      kind: 'gradient' as const,
      colors: ['#FECDD3', '#FDA4AF'],
      start: V_TOP,
      end: V_BOT,
    },
  },
  {
    id: 'gold',
    label: 'Gold',
    background: {
      kind: 'gradient' as const,
      colors: ['#D97706', '#FBBF24', '#FEF9C3'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.4, 1],
    },
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    background: {
      kind: 'gradient' as const,
      colors: ['#475569', '#1E293B', '#0F172A'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.55, 1],
    },
  },
  {
    id: 'mintTea',
    label: 'Mint tea',
    background: {
      kind: 'gradient' as const,
      colors: ['#ECFDF5', '#A7F3D0', '#34D399'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.5, 1],
    },
  },
  {
    id: 'lilac',
    label: 'Lilac',
    background: {
      kind: 'gradient' as const,
      colors: ['#EDE9FE', '#C4B5FD', '#8B5CF6'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.45, 1],
    },
  },
  {
    id: 'ember',
    label: 'Ember',
    background: {
      kind: 'gradient' as const,
      colors: ['#1C1917', '#7C2D12', '#EA580C', '#FDBA74'],
      start: V_TOP,
      end: V_BOT,
      locations: [0, 0.35, 0.7, 1],
    },
  },
] as const;

export type ReceiptCanvasPreset = (typeof RECEIPT_CANVAS_PRESETS)[number];
export type ReceiptCanvasPresetId = ReceiptCanvasPreset['id'];

export function getReceiptCanvasPreset(id: ReceiptCanvasPresetId): ReceiptCanvasPreset {
  return RECEIPT_CANVAS_PRESETS.find((p) => p.id === id) ?? RECEIPT_CANVAS_PRESETS[0]!;
}

export function getReceiptCanvasBackground(id: ReceiptCanvasPresetId): ReceiptCanvasBackground {
  return getReceiptCanvasPreset(id).background as ReceiptCanvasBackground;
}

/** Tear / side gaps: solid fill, or the bottom stop of a vertical gradient (last color). */
export function getReceiptCanvasBackdropTint(id: ReceiptCanvasPresetId): string {
  const bg = getReceiptCanvasBackground(id);
  if (bg.kind === 'solid') return bg.color;
  return bg.colors[bg.colors.length - 1] ?? bg.colors[0] ?? '#000000';
}

/** @deprecated Use getReceiptCanvasBackdropTint for scrims, or getReceiptCanvasBackground for fills */
export function getReceiptCanvasColor(id: ReceiptCanvasPresetId): string {
  return getReceiptCanvasBackdropTint(id);
}
