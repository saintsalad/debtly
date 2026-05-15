import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Group cover crop parity: with `allowsEditing: true`, iOS always uses a **square**
 * crop (`aspect` is ignored). Android respects `aspect`, so we use 1:1 there too.
 * @see https://docs.expo.dev/versions/latest/sdk/image-picker/#imagepickeroptions
 */
const GROUP_COVER_CROP_ASPECT: [number, number] = [1, 1];

export async function pickGroupPhotoFromLibrary(): Promise<string | undefined> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Photos access',
      'Allow photo library access in Settings to add a group photo.'
    );
    return undefined;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: GROUP_COVER_CROP_ASPECT,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) return undefined;
  return result.assets[0].uri;
}
