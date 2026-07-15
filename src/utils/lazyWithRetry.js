import { lazy } from 'react';

const RETRY_PARAM = '_cr';

function isChunkLoadError(err) {
  const msg = String(err && (err.message || err)) || '';
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /dynamically imported module/i.test(msg)
  );
}

function alreadyRetried() {
  try {
    return new URLSearchParams(window.location.search).has(RETRY_PARAM);
  } catch {
    return false;
  }
}

/**
 * Reload the page exactly once to recover from a stale/missing chunk after a
 * new deployment. The retry marker lives in the URL (not sessionStorage) so it
 * survives the reload even where storage is blocked, and the changed URL also
 * forces the browser to re-fetch a fresh index.html instead of a cached one.
 * If a chunk still fails after the retry, we stop (no infinite loop).
 */
export function recoverFromChunkError() {
  if (alreadyRetried()) return false;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(RETRY_PARAM, Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
  return true;
}

function cleanRetryParam() {
  if (!alreadyRetried()) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(RETRY_PARAM);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // ignore
  }
}

export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      const mod = await factory();
      cleanRetryParam();
      return mod;
    } catch (err) {
      if (isChunkLoadError(err) && recoverFromChunkError()) {
        return new Promise(() => {});
      }
      throw err;
    }
  });
}

export { isChunkLoadError };
