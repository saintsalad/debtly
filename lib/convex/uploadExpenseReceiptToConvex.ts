import type { Id } from '@/convex/_generated/dataModel';

/**
 * Upload a compressed JPEG receipt to Convex storage and return its public URL
 * for {@link api.splitGroups.addExpense} / {@link api.splitGroups.updateExpense}.
 */
export async function uploadLocalExpenseReceiptToConvex(args: {
  localFileUri: string;
  groupId: Id<'splitGroups'>;
  generateExpenseReceiptUploadUrl: (a: { groupId: Id<'splitGroups'> }) => Promise<string>;
  finalizeExpenseReceiptUpload: (a: {
    groupId: Id<'splitGroups'>;
    storageId: Id<'_storage'>;
  }) => Promise<string>;
}): Promise<string> {
  const uploadUrl = await args.generateExpenseReceiptUploadUrl({ groupId: args.groupId });
  const blob = await fetch(args.localFileUri).then((r) => r.blob());
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`Could not upload receipt (${res.status}).`);
  }
  const json = (await res.json()) as { storageId?: string };
  if (!json.storageId) {
    throw new Error('Upload response was invalid.');
  }
  return args.finalizeExpenseReceiptUpload({
    groupId: args.groupId,
    storageId: json.storageId as Id<'_storage'>,
  });
}
