import type { Id } from '@/convex/_generated/dataModel';

/**
 * Upload a local image file to Convex storage, then attach it to a split group via
 * {@link api.splitGroups.finalizeGroupImageUpload}.
 */
export async function uploadLocalGroupImageToConvex(args: {
  localFileUri: string;
  contentType?: string;
  groupId: Id<'splitGroups'>;
  generateGroupImageUploadUrl: () => Promise<string>;
  finalizeGroupImageUpload: (a: {
    groupId: Id<'splitGroups'>;
    storageId: Id<'_storage'>;
  }) => Promise<unknown>;
}): Promise<void> {
  const uploadUrl = await args.generateGroupImageUploadUrl();
  const blob = await fetch(args.localFileUri).then((r) => r.blob());
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': args.contentType ?? 'image/jpeg' },
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`Could not upload group image (${res.status}).`);
  }
  const json = (await res.json()) as { storageId?: string };
  if (!json.storageId) {
    throw new Error('Upload response was invalid.');
  }
  await args.finalizeGroupImageUpload({
    groupId: args.groupId,
    storageId: json.storageId as Id<'_storage'>,
  });
}
