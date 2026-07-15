import { lazy } from 'react';

const RELOAD_FLAG = 'lexai:chunk-reloaded';

function isChunkLoadError(err) {
  const msg = String(err && (err.message || err)) || '';
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /dynamically imported module/i.test(msg)
  );
}

function forceReloadOnce() {
  let alreadyReloaded = false;
  try {
    alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1';
  } catch {
    alreadyReloaded = false;
  }
  if (alreadyReloaded) return false;
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // ignore storage errors
  }
  window.location.reload();
  return true;
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // ignore
  }
}

/**
 * Wraps React.lazy so that when a dynamically imported chunk fails to load
 * (typically after a new deployment made the old hashed file 404), the app
 * performs a single hard reload to fetch the fresh index.html + chunk hashes.
 */
export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      const mod = await factory();
      clearChunkReloadFlag();
      return mod;
    } catch (err) {
      if (isChunkLoadError(err) && forceReloadOnce()) {
        return new Promise(() => {});
      }
      throw err;
    }
  });
}

export { isChunkLoadError };
