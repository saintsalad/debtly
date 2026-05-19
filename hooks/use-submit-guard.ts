import { useCallback, useRef, useState } from 'react';

/**
 * Prevents overlapping submits (double-taps) during async/slow save handlers.
 * Returns `busy` after the first invocation until `fn()` settles.
 */
export function useSubmitGuard(): {
  busy: boolean;
  runGuarded: (fn: () => void | Promise<void>) => Promise<void>;
} {
  const inFlightRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const runGuarded = useCallback(async (fn: () => void | Promise<void>) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      await Promise.resolve(fn());
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, runGuarded };
}
