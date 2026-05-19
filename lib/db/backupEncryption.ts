import { Buffer } from 'buffer';
import { gcm } from '@noble/ciphers/aes.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

import { getDebtlyBackupKey } from '@/lib/db/backupAppKey';
import { randomBytes } from '@/lib/db/backupRandom';
import type { SignedBackupEnvelope } from '@/lib/db/backupIntegrity';

/** Current encrypted backup wrapper (app-managed key). */
export const ENCRYPTED_BACKUP_FORMAT = 3 as const;

/** Legacy password-based wrapper (import only). */
const LEGACY_PASSPHRASE_BACKUP_FORMAT = 2 as const;

export const BACKUP_ENCRYPTION_ALGORITHM = 'AES-256-GCM' as const;
export const BACKUP_KEY_DERIVATION = 'APP-KEY-SHA256-v1' as const;

const LEGACY_KDF_ALGORITHM = 'PBKDF2-HMAC-SHA256';

const IV_BYTES = 12;

export interface EncryptedBackupFileV3 {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  encryption: typeof BACKUP_ENCRYPTION_ALGORITHM;
  keyDerivation: typeof BACKUP_KEY_DERIVATION;
  iv: string;
  ciphertext: string;
}

/** @deprecated Password-based exports (format 2). */
interface EncryptedBackupFileV2 {
  format: typeof LEGACY_PASSPHRASE_BACKUP_FORMAT;
  encryption: typeof BACKUP_ENCRYPTION_ALGORITHM;
  kdf: typeof LEGACY_KDF_ALGORITHM;
  kdfIterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export type EncryptedBackupFile = EncryptedBackupFileV3 | EncryptedBackupFileV2;

export const BACKUP_DECRYPT_ERROR =
  'This backup file is corrupted or was not created by Debtly. Export a new backup and try again.';

export const BACKUP_LEGACY_PASSWORD_ERROR =
  'This backup used an older password. Export a new backup from Profile — no password needed.';

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

function isEncryptedBackupFileV3(data: unknown): data is EncryptedBackupFileV3 {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.format === ENCRYPTED_BACKUP_FORMAT &&
    obj.encryption === BACKUP_ENCRYPTION_ALGORITHM &&
    obj.keyDerivation === BACKUP_KEY_DERIVATION &&
    typeof obj.iv === 'string' &&
    typeof obj.ciphertext === 'string'
  );
}

function isEncryptedBackupFileV2(data: unknown): data is EncryptedBackupFileV2 {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.format === LEGACY_PASSPHRASE_BACKUP_FORMAT &&
    obj.encryption === BACKUP_ENCRYPTION_ALGORITHM &&
    obj.kdf === LEGACY_KDF_ALGORITHM &&
    typeof obj.kdfIterations === 'number' &&
    typeof obj.salt === 'string' &&
    typeof obj.iv === 'string' &&
    typeof obj.ciphertext === 'string'
  );
}

export function isEncryptedBackupFile(data: unknown): data is EncryptedBackupFile {
  return isEncryptedBackupFileV3(data) || isEncryptedBackupFileV2(data);
}

export function encryptSignedEnvelope(envelope: SignedBackupEnvelope): EncryptedBackupFileV3 {
  const iv = randomBytes(IV_BYTES);
  const key = getDebtlyBackupKey();
  const plaintext = utf8ToBytes(JSON.stringify(envelope));
  const ciphertext = gcm(key, iv).encrypt(plaintext);

  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    encryption: BACKUP_ENCRYPTION_ALGORITHM,
    keyDerivation: BACKUP_KEY_DERIVATION,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
}

function decryptWithAppKey(file: EncryptedBackupFileV3): SignedBackupEnvelope {
  let iv: Uint8Array;
  let ciphertext: Uint8Array;
  try {
    iv = base64ToBytes(file.iv);
    ciphertext = base64ToBytes(file.ciphertext);
  } catch {
    throw new Error(BACKUP_DECRYPT_ERROR);
  }

  if (iv.length !== IV_BYTES) {
    throw new Error(BACKUP_DECRYPT_ERROR);
  }

  let plaintext: Uint8Array;
  try {
    plaintext = gcm(getDebtlyBackupKey(), iv).decrypt(ciphertext);
  } catch {
    throw new Error(BACKUP_DECRYPT_ERROR);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error(BACKUP_DECRYPT_ERROR);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(BACKUP_DECRYPT_ERROR);
  }

  return parsed as SignedBackupEnvelope;
}

export function decryptToSignedEnvelope(file: EncryptedBackupFile): SignedBackupEnvelope {
  if (isEncryptedBackupFileV3(file)) {
    return decryptWithAppKey(file);
  }

  if (isEncryptedBackupFileV2(file)) {
    throw new Error(BACKUP_LEGACY_PASSWORD_ERROR);
  }

  throw new Error(BACKUP_DECRYPT_ERROR);
}
