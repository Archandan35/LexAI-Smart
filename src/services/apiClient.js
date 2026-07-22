import { withRetry } from '@/utils/retry.js';

function isNetworkFailure(err) {
  if (err.name === 'AbortError') return false;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('networkerror') ||
    msg.includes('failed to fetch') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('typeerror') ||
    msg.includes('enetdown') ||
    msg.includes('econnrefused') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    (err instanceof TypeError && msg.includes('fetch'))
  );
}

function isRetryableStatus(status) {
  return status >= 500 || status === 429;
}

export async function apiFetch(url, options = {}) {
  const { retryOnNetworkError = true, retryOnServerError = true, ...fetchOptions } = options;

  async function attempt() {
    const res = await fetch(url, fetchOptions);

    if (res.ok) return res;

    if (isRetryableStatus(res.status) && retryOnServerError) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.response = res;
      throw err;
    }

    if (res.status === 204) return res;

    const body = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = body;
    err.response = res;
    throw err;
  }

  if (!retryOnNetworkError && !retryOnServerError) {
    return attempt();
  }

  return withRetry(attempt, {
    maxRetries: 3,
    baseDelay: 500,
    onRetry(err, attempt, delay) {
      if (err.status && !isRetryableStatus(err.status)) return;
      console.warn(`[apiClient] Retry ${attempt + 1} after ${delay.toFixed(0)}ms — ${err.message}`);
    },
  });
}
