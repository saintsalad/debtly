/**
 * Logical frame size for the receipt share canvas (matches prior 9:16 = 360×640).
 * Export uses {@link RECEIPT_ASPECT_EXPORT_SCALE}× these dimensions.
 */
export const RECEIPT_ASPECT_PRESETS = [
  { id: 'story', label: '9:16', frameWidth: 360, frameHeight: 640 },
  { id: 'square', label: '1:1', frameWidth: 360, frameHeight: 360 },
  { id: 'portrait34', label: '3:4', frameWidth: 360, frameHeight: 480 },
  { id: 'portrait45', label: '4:5', frameWidth: 360, frameHeight: 450 },
] as const;

export type ReceiptAspectPresetId = (typeof RECEIPT_ASPECT_PRESETS)[number]['id'];

export type ReceiptAspectPreset = (typeof RECEIPT_ASPECT_PRESETS)[number];

export const RECEIPT_ASPECT_EXPORT_SCALE = 3;

export function getReceiptAspectPreset(id: ReceiptAspectPresetId): ReceiptAspectPreset {
  return RECEIPT_ASPECT_PRESETS.find((p) => p.id === id) ?? RECEIPT_ASPECT_PRESETS[0]!;
}

export function getReceiptExportSize(preset: ReceiptAspectPreset): {
  width: number;
  height: number;
} {
  return {
    width: preset.frameWidth * RECEIPT_ASPECT_EXPORT_SCALE,
    height: preset.frameHeight * RECEIPT_ASPECT_EXPORT_SCALE,
  };
}
