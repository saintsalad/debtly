import * as SecureStore from 'expo-secure-store';

import type { TokenStorage } from '@convex-dev/auth/react';

/**
 * Convex Auth token storage using iOS/Android secure storage (required by Convex Auth on React Native).
 */
export const convexSecureTokenStorage: TokenStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
