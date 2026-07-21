import { useCallback, useEffect, useSyncExternalStore } from 'react';

const MAX_ENTRIES = 500;
const GC_INTERVAL_MS = 60000;
const MAX_ENTRY_AGE_MS = 3600000;

const store = new Map();
const accessOrder = [];

function touch(key) {
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) accessOrder.splice(idx, 1);
  accessOrder.push(key);
}

function evictLRU() {
  while (store.size > MAX_ENTRIES) {
    const oldest = accessOrder.shift();
    if (oldest !== undefined) {
      const entry = store.get(oldest);
      if (entry && entry.subs.size === 0) {
        store.delete(oldest);
      } else if (entry) {
        accessOrder.push(oldest);
      }
    } else break;
  }
}

let gcTimer = null;
function startGC() {
  if (gcTimer) return;
  gcTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.subs.size === 0 && entry.ts > 0 && now - entry.ts > MAX_ENTRY_AGE_MS) {
        store.delete(key);
        const idx = accessOrder.indexOf(key);
        if (idx !== -1) accessOrder.splice(idx, 1);
      }
    }
    evictLRU();
  }, GC_INTERVAL_MS);
  if (gcTimer.unref) gcTimer.unref();
}
startGC();

function getEntry(key) {
  let entry = store.get(key);
  if (!entry) {
    evictLRU();
    entry = {
      data: undefined,
      error: null,
      status: 'idle',
      promise: null,
      ts: 0,
      version: 0,
      fetcher: null,
      subs: new Set(),
    };
    store.set(key, entry);
  }
  touch(key);
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

export function invalidateQuery(key) {
  const entry = getEntry(key);
  entry.ts = 0;
  return runFetch(key, entry.fetcher);
}

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

export function useQuery(key, fetcher, options = {}) {
  const { staleTime = 300000, enabled = true } = options;

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

export function clearCache() {
  store.clear();
  accessOrder.length = 0;
}

export default useQuery;
