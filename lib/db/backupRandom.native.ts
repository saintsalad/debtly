import { getRandomBytes } from 'expo-crypto';

/** CSPRNG bytes (React Native via expo-crypto). */
export function randomBytes(length: number): Uint8Array {
  return getRandomBytes(length);
}
