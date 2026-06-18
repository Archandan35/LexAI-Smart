// Tiny Result wrapper so logic/services can return predictable shapes
// without throwing across layer boundaries.
export function ok(data, meta = {}) {
  return { ok: true, data, error: null, ...meta };
}

export function fail(error, meta = {}) {
  return { ok: false, data: null, error: typeof error === 'string' ? error : error?.message || 'Unknown error', ...meta };
}

export async function guard(fn) {
  try {
    return ok(await fn());
  } catch (e) {
    return fail(e);
  }
}
