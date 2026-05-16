export const RECEIPT_CANVAS_PRESETS = [
  { id: 'black', label: 'Black', color: '#000000' },
  { id: 'rose', label: 'Rose', color: '#F2D4D8' },
  { id: 'mint', label: 'Mint', color: '#DDEEE7' },
  { id: 'cream', label: 'Cream', color: '#F6ECDC' },
] as const;

export type ReceiptCanvasPresetId = (typeof RECEIPT_CANVAS_PRESETS)[number]['id'];

export function getReceiptCanvasColor(id: ReceiptCanvasPresetId): string {
  return RECEIPT_CANVAS_PRESETS.find((p) => p.id === id)?.color ?? '#000000';
}
