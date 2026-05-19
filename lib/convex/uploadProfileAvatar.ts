import type { Id } from '@/convex/_generated/dataModel';

/**
 * Upload a JPEG file from disk to Convex file storage and attach URL to the signed-in user.
 */
export async function uploadLocalAvatarToConvex(args: {
  localFileUri: string;
  generateUploadUrl: () => Promise<string>;
  finalizeProfileAvatar: (a: { storageId: Id<'_storage'> }) => Promise<string>;
}): Promise<string> {
  const { localFileUri, generateUploadUrl, finalizeProfileAvatar } = args;
  const uploadUrl = await generateUploadUrl();
  const blob = await fetch(localFileUri).then((r) => r.blob());
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`Could not upload avatar (${res.status}).`);
  }
  const json = (await res.json()) as { storageId?: string };
  if (!json.storageId) {
    throw new Error('Upload response was invalid.');
  }
  return finalizeProfileAvatar({ storageId: json.storageId as Id<'_storage'> });
}
