import { Fonts } from '@/constants/theme';

/** Portrait story canvas (9:16). Export scales 3× to 1080×1920. */
export const STORY_FRAME_WIDTH = 360;
export const STORY_FRAME_HEIGHT = 640;
export const STORY_EXPORT_WIDTH = 1080;
export const STORY_EXPORT_HEIGHT = 1920;

export const RECEIPT_WIDTH = 300;
export const RECEIPT_PAPER = '#FFFFFF';
export const RECEIPT_INK = '#000000';
export const RECEIPT_SCRIM = '#F2D4D8';
export const RECEIPT_MONO = Fonts.mono;

export const receiptType = {
  wordmark: {
    fontFamily: RECEIPT_MONO,
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 4,
    color: RECEIPT_INK,
    textTransform: 'uppercase' as const,
  },
  timestamp: {
    fontFamily: RECEIPT_MONO,
    fontSize: 10,
    color: RECEIPT_INK,
    opacity: 0.75,
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontFamily: RECEIPT_MONO,
    fontSize: 12,
    fontWeight: '600' as const,
    color: RECEIPT_INK,
    textAlign: 'center' as const,
  },
  reference: {
    fontFamily: RECEIPT_MONO,
    fontSize: 15,
    fontWeight: '700' as const,
    color: RECEIPT_INK,
    textAlign: 'center' as const,
    letterSpacing: 0.5,
  },
  rowLabel: {
    fontFamily: RECEIPT_MONO,
    fontSize: 11,
    color: RECEIPT_INK,
    flexShrink: 0,
  },
  rowValue: {
    fontFamily: RECEIPT_MONO,
    fontSize: 11,
    fontWeight: '600' as const,
    color: RECEIPT_INK,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 8,
  },
  footer: {
    fontFamily: RECEIPT_MONO,
    fontSize: 22,
    fontWeight: '700' as const,
    fontStyle: 'italic' as const,
    color: RECEIPT_INK,
    letterSpacing: 2,
    textAlign: 'center' as const,
  },
  subsection: {
    fontFamily: RECEIPT_MONO,
    fontSize: 10,
    fontWeight: '600' as const,
    color: RECEIPT_INK,
    textAlign: 'center' as const,
    marginTop: 4,
  },
};
