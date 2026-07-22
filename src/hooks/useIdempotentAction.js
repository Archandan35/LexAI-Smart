import { useRef, useCallback } from 'react';

export function useIdempotentAction() {
  const inFlight = useRef(new Set());

  const execute = useCallback(async (key, fn) => {
    if (inFlight.current.has(key)) {
      console.warn(`[Idempotent] Action "${key}" already in flight — skipped`);
      return { ok: false, error: 'Duplicate submission prevented' };
    }
    inFlight.current.add(key);
    try {
      const result = await fn();
      return result;
    } finally {
      inFlight.current.delete(key);
    }
  }, []);

  const isPending = useCallback((key) => inFlight.current.has(key), []);

  return { execute, isPending };
}
