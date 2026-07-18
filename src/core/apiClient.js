import { backendConfig } from '@/config/backend.js';

function normalizeError(err) {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  return new Error(String(err || 'Unknown error'));
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export const apiClient = {
  async request(method, path, options = {}) {
    const { body, headers: extraHeaders, timeout, retries, signal } = options;
    const url = backendConfig.resolve(path);
    if (!url) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: `Backend not configured. Set VITE_BACKEND_URL to point to your API server.`,
        _meta: { method, path, configured: false },
      };
    }

    const maxRetries = retries ?? backendConfig.retryCount;
    const ms = timeout ?? backendConfig.timeout;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), ms);
        const combinedSignal = signal
          ? anySignal([signal, ac.signal])
          : ac.signal;

        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...extraHeaders,
        };

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: combinedSignal,
        });

        clearTimeout(timer);

        let data = null;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          try { data = await res.json(); } catch { data = null; }
        } else {
          try { data = await res.text(); } catch { data = null; }
        }

        return {
          ok: res.ok,
          status: res.status,
          data,
          error: res.ok ? null : (data?.error || data?.message || `HTTP ${res.status}`),
          _meta: { method, path, attempt, configured: true },
        };
      } catch (e) {
        if (e.name === 'AbortError') {
          lastError = new Error(`Request timed out after ${ms}ms: ${method} ${path}`);
        } else {
          lastError = normalizeError(e);
        }
        if (attempt < maxRetries) {
          await delay(backendConfig.retryDelay);
        }
      }
    }

    return {
      ok: false,
      status: 0,
      data: null,
      error: lastError.message,
      _meta: { method, path, attempts: maxRetries + 1, configured: true },
    };
  },

  get(path, options) { return this.request('GET', path, options); },
  post(path, body, options) { return this.request('POST', path, { ...options, body }); },
  put(path, body, options) { return this.request('PUT', path, { ...options, body }); },
  del(path, options) { return this.request('DELETE', path, options); },

  async health() {
    return this.get(backendConfig.endpoints.health);
  },

  async version() {
    return this.get(backendConfig.endpoints.version);
  },

  async testDatabase(payload) {
    return this.post(backendConfig.endpoints.databaseTest, payload);
  },

  async installDatabase(payload, options) {
    return this.post(backendConfig.endpoints.databaseInstall, payload, options);
  },

  async verifyDatabase(payload) {
    return this.post(backendConfig.endpoints.databaseVerify, payload);
  },

  async migrateDatabase(payload) {
    return this.post(backendConfig.endpoints.databaseMigrate, payload);
  },

  async backupDatabase(payload) {
    return this.post(backendConfig.endpoints.databaseBackup, payload);
  },

  async restoreDatabase(payload) {
    return this.post(backendConfig.endpoints.databaseRestore, payload);
  },
};

function anySignal(signals) {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) { controller.abort(s.reason); return controller.signal; }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

export default apiClient;
