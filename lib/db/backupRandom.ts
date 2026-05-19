import { randomFillSync } from 'node:crypto';

/** CSPRNG bytes (Node / Vitest). */
export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  randomFillSync(out);
  return out;
}
