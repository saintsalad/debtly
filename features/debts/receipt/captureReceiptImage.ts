import type { RefObject } from 'react';
import { Alert, Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { copyAsync, cacheDirectory } from 'expo-file-system/legacy';
import { ensureShareableFileUri } from '@/features/debts/receipt/shareReceiptImage';

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** iOS/Android: copy view-shot temp file to a stable `.png` in cache (required extension for Photos). */
async function materializeExportPng(tmpUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return ensureShareableFileUri(tmpUri);
  }
  const dir = cacheDirectory;
  if (!dir) {
    return ensureShareableFileUri(tmpUri);
  }
  const dest = `${dir}debtly-receipt-${Date.now()}.png`;
  await copyAsync({
    from: ensureShareableFileUri(tmpUri),
    to: dest,
  });
  return dest;
}

export async function captureStoryReceiptImage(
  viewRef: RefObject<View | null>,
  exportSize: { width: number; height: number },
): Promise<string | null> {
  if (!viewRef.current) {
    Alert.alert('Unable to export', 'Receipt is not ready. Try again.');
    return null;
  }

  await waitForLayout();

  try {
    const tmpUri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: exportSize.width,
      height: exportSize.height,
    });
    return await materializeExportPng(tmpUri);
  } catch {
    Alert.alert('Unable to export', 'Could not capture the receipt image. Try again.');
    return null;
  }
}
