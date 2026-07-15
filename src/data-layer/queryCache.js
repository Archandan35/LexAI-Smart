import { useCallback, useEffect, useSyncExternalStore } from 'react';

// queryCache — a tiny stale-while-revalidate cache shared across the whole app.
//
// Why: every page used to refetch its data from the remote database on mount,
// so navigating between pages showed a spinner and hit the network every time.
// This cache keeps the last result per key in memory, hands it back instantly on
// the next visit (no spinner), and revalidates in the background. In-flight
// requests are de-duplicated and all subscribers re-render when data changes, so
// separate components/pages that read the same key stay in sync.

const store = new Map();

function getEntry(key) {
  let entry = store.get(key);
  if (!entry) {
    entry = {
      data: undefined,
      error: null,
      status: 'idle', // idle | loading | refreshing | success | error
      promise: null,
      ts: 0,
      version: 0,
      fetcher: null,
      subs: new Set(),
    };
    store.set(key, entry);
  }
  return entry;
}

function emit(entry) {
  entry.version += 1;
  entry.subs.forEach((fn) => fn());
}

function runFetch(key, fetcher) {
  const entry = getEntry(key);
  if (fetcher) entry.fetcher = fetcher;
  if (entry.promise) return entry.promise;
  const fn = entry.fetcher;
  if (typeof fn !== 'function') return Promise.resolve(entry.data);

  entry.status = entry.data === undefined ? 'loading' : 'refreshing';
  emit(entry);

  entry.promise = (async () => {
    try {
      const data = await fn();
      entry.data = data;
      entry.error = null;
      entry.status = 'success';
      entry.ts = Date.now();
    } catch (err) {
      entry.error = err;
      entry.status = 'error';
    } finally {
      entry.promise = null;
      emit(entry);
    }
    return entry.data;
  })();

  return entry.promise;
}

// Force a background refetch for a key (e.g. after a mutation). Returns the
// pending promise so callers can await the refreshed data.
export function invalidateQuery(key) {
  const entry = getEntry(key);
  entry.ts = 0;
  return runFetch(key, entry.fetcher);
}

// Overwrite a cache entry directly without a network round-trip (optimistic).
export function setQueryData(key, data) {
  const entry = getEntry(key);
  entry.data = typeof data === 'function' ? data(entry.data) : data;
  entry.status = 'success';
  entry.ts = Date.now();
  emit(entry);
}

export function getQueryData(key) {
  return store.get(key)?.data;
}

// useQuery — subscribe to a cached key and (re)fetch when stale/missing.
export function useQuery(key, fetcher, options = {}) {
  const { staleTime = 30000, enabled = true } = options;

  const entry = getEntry(key);
  entry.fetcher = fetcher;

  useSyncExternalStore(
    useCallback((cb) => {
      const e = getEntry(key);
      e.subs.add(cb);
      return () => e.subs.delete(cb);
    }, [key]),
    useCallback(() => getEntry(key).version, [key]),
    useCallback(() => getEntry(key).version, [key]),
  );

  useEffect(() => {
    if (!enabled) return;
    const e = getEntry(key);
    const stale = Date.now() - e.ts > staleTime;
    if (e.data === undefined || stale) runFetch(key);
  }, [key, enabled, staleTime]);

  const refresh = useCallback(() => invalidateQuery(key), [key]);

  const current = getEntry(key);
  return {
    data: current.data,
    error: current.error,
    loading: current.data === undefined && current.status !== 'error',
    refreshing: current.status === 'refreshing',
    refresh,
  };
}

export default useQuery;
