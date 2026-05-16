import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RECEIPT_PHOTO_CROP_ASPECT } from '@/features/debts/receipt/receiptTheme';

/**
 * Receipt photo crop parity with the thermal slot (`RECEIPT_PHOTO_DISPLAY_*`).
 * Same pattern as {@link pickGroupPhotoFromLibrary}: Android respects `aspect`;
 * iOS behavior depends on the system picker — see Expo ImagePicker docs.
 */
export async function pickReceiptPhotoFromLibrary(): Promise<string | undefined> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Photos access',
      'Allow photo library access to insert a photo in your print.'
    );
    return undefined;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: RECEIPT_PHOTO_CROP_ASPECT,
    quality: 0.9,
  });

  if (result.canceled || !result.assets[0]?.uri) return undefined;
  return result.assets[0].uri;
}
