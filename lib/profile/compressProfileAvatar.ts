import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
} from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { PROFILE_AVATAR_FILENAME } from '@/lib/profile/profileAvatarConstants';

const MAX_EDGE_PX = 512;
const JPEG_QUALITY = 0.82;

/**
 * Resize + JPEG-compress a picked image for use as a profile avatar.
 * Writes to a stable path under the app document directory.
 */
export async function compressProfileAvatarToDocument(sourceUri: string): Promise<string> {
  const manipulated = await manipulateAsync(
    sourceUri,
    [{ resize: { width: MAX_EDGE_PX } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG }
  );

  const base = documentDirectory;
  if (!base) {
    throw new Error('App storage is not available.');
  }
  const dest = `${base}${PROFILE_AVATAR_FILENAME}`;
  const tmpExists = await getInfoAsync(manipulated.uri);
  if (!tmpExists.exists) {
    throw new Error('Could not read compressed image.');
  }

  const existing = await getInfoAsync(dest);
  if (existing.exists) {
    await deleteAsync(dest, { idempotent: true });
  }
  await copyAsync({ from: manipulated.uri, to: dest });

  return dest;
}

export async function deleteProfileAvatarFile(): Promise<void> {
  try {
    const base = documentDirectory;
    if (!base) return;
    const dest = `${base}${PROFILE_AVATAR_FILENAME}`;
    const existing = await getInfoAsync(dest);
    if (existing.exists) {
      await deleteAsync(dest, { idempotent: true });
    }
  } catch {
    // Best-effort cleanup
  }
}
