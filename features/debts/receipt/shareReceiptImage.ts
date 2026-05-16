import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert, Platform, Share } from 'react-native';

/** Normalized `file://` URI for local paths (iOS view-shot + FileSystem paths). */
export function ensureShareableFileUri(uri: string): string {
  const t = uri.trim();
  if (t.startsWith('file://')) return t;
  if (t.startsWith('content://')) return t;
  if (t.startsWith('/')) return `file://${t}`;
  return t;
}

export async function saveReceiptToPhotos(uri: string): Promise<boolean> {
  const fileUri = ensureShareableFileUri(uri);

  try {
    const { status: existing } = await MediaLibrary.getPermissionsAsync(true);
    let granted = existing === MediaLibrary.PermissionStatus.GRANTED;
    if (!granted) {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      granted = status === MediaLibrary.PermissionStatus.GRANTED;
    }
    if (!granted) {
      Alert.alert(
        'Photos access needed',
        'Allow Debtly to add images to your photo library so the receipt can be saved.'
      );
      return false;
    }

    await MediaLibrary.saveToLibraryAsync(fileUri);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    Alert.alert('Could not save', `Unable to save the receipt: ${message}`);
    return false;
  }
}

export async function shareReceiptImage(uri: string): Promise<void> {
  const fileUri = ensureShareableFileUri(uri);

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Share receipt',
      });
      return;
    }
  } catch {
    // Fall through to React Native Share (more reliable for some iOS setups).
  }

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { url: fileUri }
        : { message: 'Debtly receipt', url: fileUri }
    );
  } catch {
    Alert.alert('Unable to share', 'Please try again in a moment.');
  }
}
