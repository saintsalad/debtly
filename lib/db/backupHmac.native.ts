import { CryptoDigestAlgorithm, digest } from 'expo-crypto';

const HMAC_BLOCK_SIZE = 64;

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const digestBuffer = await digest(CryptoDigestAlgorithm.SHA256, data);
  return new Uint8Array(digestBuffer);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** HMAC-SHA256 hex digest (React Native via expo-crypto). */
export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  let keyBlock = utf8Bytes(key);
  if (keyBlock.length > HMAC_BLOCK_SIZE) {
    keyBlock = await sha256Bytes(keyBlock);
  }
  if (keyBlock.length < HMAC_BLOCK_SIZE) {
    const padded = new Uint8Array(HMAC_BLOCK_SIZE);
    padded.set(keyBlock);
    keyBlock = padded;
  }

  const outerKeyPad = new Uint8Array(HMAC_BLOCK_SIZE);
  const innerKeyPad = new Uint8Array(HMAC_BLOCK_SIZE);
  for (let i = 0; i < HMAC_BLOCK_SIZE; i++) {
    outerKeyPad[i] = keyBlock[i]! ^ 0x5c;
    innerKeyPad[i] = keyBlock[i]! ^ 0x36;
  }

  const innerHash = await sha256Bytes(concatBytes(innerKeyPad, utf8Bytes(message)));
  const outerHash = await sha256Bytes(concatBytes(outerKeyPad, innerHash));
  return bytesToHex(outerHash);
}
