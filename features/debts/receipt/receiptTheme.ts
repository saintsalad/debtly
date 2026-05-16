import { Fonts } from '@/constants/theme';

/** Portrait story canvas (9:16). Export scales 3× to 1080×1920. */
export const STORY_FRAME_WIDTH = 360;
export const STORY_FRAME_HEIGHT = 640;
export const STORY_EXPORT_WIDTH = 1080;
export const STORY_EXPORT_HEIGHT = 1920;

export const RECEIPT_WIDTH = 300;
/** Minimum receipt height on the 9:16 story canvas (paper + tear edge). */
export const RECEIPT_MIN_HEIGHT = STORY_FRAME_HEIGHT * 0.6;
export const RECEIPT_PAPER = '#FFFFFF';
export const RECEIPT_INK = '#000000';
export const RECEIPT_MUTED = '#8A8A8A';
export const RECEIPT_SCRIM = '#F2D4D8';
export const RECEIPT_MONO = Fonts.mono;
export const RECEIPT_PAD_H = 22;
/** Vertical space between receipt sections and cut lines. */
export const RECEIPT_RULE_GAP = 10;
/** Vertical space between rows within a padded section. */
export const RECEIPT_CONTENT_GAP = 8;
/** Slight random tilt range (degrees) for the receipt paper on the story canvas. */
export const RECEIPT_TILT_MIN_DEG = 1.5;
export const RECEIPT_TILT_MAX_DEG = 3.5;

/** Stable left/right tilt from debt id (same angle for preview and export). */
export function getReceiptTiltDegrees(debtId: string): number {
  let hash = 0;
  for (let i = 0; i < debtId.length; i++) {
    hash = Math.imul(31, hash) + debtId.charCodeAt(i);
    hash |= 0;
  }
  const sign = Math.abs(hash) % 2 === 0 ? 1 : -1;
  const t = (Math.abs(hash) % 1000) / 1000;
  const magnitude = RECEIPT_TILT_MIN_DEG + t * (RECEIPT_TILT_MAX_DEG - RECEIPT_TILT_MIN_DEG);
  return sign * magnitude;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Receipt hero photo slot — same size as dashed frame / Svg viewport. */
export const RECEIPT_PHOTO_DISPLAY_WIDTH = RECEIPT_WIDTH - RECEIPT_PAD_H * 2;
export const RECEIPT_PHOTO_DISPLAY_HEIGHT = 148;

const _receiptPhotoGcd = gcd(RECEIPT_PHOTO_DISPLAY_WIDTH, RECEIPT_PHOTO_DISPLAY_HEIGHT);

/**
 * ImagePicker `aspect` — Android uses this for the crop rectangle.
 * Reduced pair so width/height match the thermal slot (same idea as group `1:1`).
 * iOS editing may not apply the same crop; receipt still uses a fixed slot + center `slice`.
 */
export const RECEIPT_PHOTO_CROP_ASPECT: [number, number] = [
  RECEIPT_PHOTO_DISPLAY_WIDTH / _receiptPhotoGcd,
  RECEIPT_PHOTO_DISPLAY_HEIGHT / _receiptPhotoGcd,
];

export const receiptType = {
  /** Top-bar: icon left, label right */
  headerLabel: {
    fontFamily: RECEIPT_MONO,
    fontSize: 10,
    color: RECEIPT_INK,
    letterSpacing: 0.3,
  },
  /** Hero two-column */
  heroTitle: {
    fontFamily: RECEIPT_MONO,
    fontSize: 13,
    fontWeight: '700' as const,
    color: RECEIPT_INK,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontFamily: RECEIPT_MONO,
    fontSize: 9,
    color: RECEIPT_MUTED,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  transactionId: {
    fontFamily: RECEIPT_MONO,
    fontSize: 8,
    color: RECEIPT_MUTED,
    textAlign: 'center' as const,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  rowLabel: {
    fontFamily: RECEIPT_MONO,
    fontSize: 9,
    color: RECEIPT_MUTED,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    flexShrink: 0,
  },
  rowValue: {
    fontFamily: RECEIPT_MONO,
    fontSize: 11,
    fontWeight: '700' as const,
    color: RECEIPT_INK,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 12,
  },
  footer: {
    fontFamily: RECEIPT_MONO,
    fontSize: 18,
    fontWeight: '700' as const,
    color: RECEIPT_INK,
    letterSpacing: 1.5,
    textAlign: 'center' as const,
  },
  footerTagline: {
    fontFamily: RECEIPT_MONO,
    fontSize: 8,
    color: RECEIPT_MUTED,
    textAlign: 'center' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    marginTop: 8,
  },
  subsection: {
    fontFamily: RECEIPT_MONO,
    fontSize: 9,
    fontWeight: '600' as const,
    color: RECEIPT_MUTED,
    textAlign: 'center' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginTop: 2,
    marginBottom: 8,
  },
};
