import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * App-internal backup encryption key (32 bytes). Not user-facing; obscures backup JSON
 * from other apps and casual inspection. Portable across devices running Debtly.
 */
const BACKUP_KEY_MATERIAL = 'debtly-backup-app-key-v1';

let cachedKey: Uint8Array | null = null;

export function getDebtlyBackupKey(): Uint8Array {
  if (!cachedKey) {
    cachedKey = sha256(utf8ToBytes(BACKUP_KEY_MATERIAL));
  }
  return cachedKey;
}
