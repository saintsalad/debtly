import { createHmac } from 'node:crypto';

/** HMAC-SHA256 hex digest (Node / Vitest). */
export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  return createHmac('sha256', key).update(message, 'utf8').digest('hex');
}
