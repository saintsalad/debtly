import type { StoreApi } from 'zustand';

export function subscribeStore<T>(
  store: StoreApi<T>,
  saveFn: (state: T) => Promise<void>,
  debounceMs = 300
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;

  const flush = () => {
    timer = null;
    if (pending) {
      const state = pending;
      pending = null;
      void saveFn(state);
    }
  };

  return store.subscribe((state) => {
    pending = state;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  });
}
