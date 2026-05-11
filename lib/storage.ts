import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

type AsyncStorageModule = typeof import('@react-native-async-storage/async-storage');
let asyncStoragePromise: Promise<AsyncStorageModule['default'] | null> | null = null;

function getAsyncStorage() {
  if (Platform.OS === 'web') {
    return Promise.resolve(null);
  }

  if (!asyncStoragePromise) {
    asyncStoragePromise = import('@react-native-async-storage/async-storage')
      .then((module) => module.default)
      .catch(() => null);
  }

  return asyncStoragePromise;
}

async function readItem(name: string): Promise<string | null> {
  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(name);
  }

  const asyncStorage = await getAsyncStorage();
  if (asyncStorage) {
    try {
      return await asyncStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  }

  return memory.get(name) ?? null;
}

async function writeItem(name: string, value: string): Promise<void> {
  memory.set(name, value);

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(name, value);
    return;
  }

  const asyncStorage = await getAsyncStorage();
  if (!asyncStorage) {
    return;
  }

  try {
    await asyncStorage.setItem(name, value);
  } catch {
    // Keep the in-memory copy when native storage is unavailable.
  }
}

async function deleteItem(name: string): Promise<void> {
  memory.delete(name);

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(name);
    return;
  }

  const asyncStorage = await getAsyncStorage();
  if (!asyncStorage) {
    return;
  }

  try {
    await asyncStorage.removeItem(name);
  } catch {
    // Keep the in-memory copy when native storage is unavailable.
  }
}

export const zustandStorage: StateStorage = {
  getItem: (name) => readItem(name),
  setItem: (name, value) => writeItem(name, value),
  removeItem: (name) => deleteItem(name),
};
