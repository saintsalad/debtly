import { hmacSha256Hex } from '@/lib/db/backupHmac';

import type { ExportData } from '@/lib/db/exportImportTypes';

/** Envelope format version (distinct from `ExportData.version`). */
export const BACKUP_ENVELOPE_FORMAT = 1 as const;

export const BACKUP_SIGNATURE_ALGORITHM = 'HMAC-SHA256' as const;

/**
 * App-wide integrity key. Detects casual tampering with backup JSON; not a substitute
 * for encryption or a user passphrase (see docs/SECURITY_AUDIT.md).
 */
const BACKUP_INTEGRITY_SECRET = 'debtly-backup-integrity-v1';

export interface SignedBackupEnvelope {
  format: typeof BACKUP_ENVELOPE_FORMAT;
  algorithm: typeof BACKUP_SIGNATURE_ALGORITHM;
  payload: ExportData;
  signature: string;
}

/** Stable JSON for signing — fixed key order, no whitespace. */
export function canonicalPayloadString(payload: ExportData): string {
  return JSON.stringify({
    version: payload.version,
    exportedAt: payload.exportedAt,
    profile: payload.profile,
    debts: payload.debts,
    groups: payload.groups,
    billSplits: payload.billSplits,
  });
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signBackupPayload(payload: ExportData): Promise<string> {
  const canonical = canonicalPayloadString(payload);
  return hmacSha256Hex(BACKUP_INTEGRITY_SECRET, canonical);
}

export async function verifyBackupPayload(
  payload: ExportData,
  signature: string
): Promise<boolean> {
  if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }
  const expected = await signBackupPayload(payload);
  return timingSafeEqualHex(expected.toLowerCase(), signature.toLowerCase());
}

export function isSignedBackupEnvelope(data: unknown): data is SignedBackupEnvelope {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.format === BACKUP_ENVELOPE_FORMAT &&
    obj.algorithm === BACKUP_SIGNATURE_ALGORITHM &&
    typeof obj.signature === 'string' &&
    typeof obj.payload === 'object' &&
    obj.payload !== null
  );
}

export async function buildSignedBackupEnvelope(
  payload: ExportData
): Promise<SignedBackupEnvelope> {
  const signature = await signBackupPayload(payload);
  return {
    format: BACKUP_ENVELOPE_FORMAT,
    algorithm: BACKUP_SIGNATURE_ALGORITHM,
    payload,
    signature,
  };
}

export const BACKUP_INTEGRITY_ERROR =
  'This backup file was modified or is not a valid Debtly export. Re-export from the app and try again.';
