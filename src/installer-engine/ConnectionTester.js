import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';
import { BackendGateway } from '@/backend/BackendGateway.js';

export const ConnectionTester = {
  async testProvider() {
    const provider = getDatabaseProvider();
    const name = config.providers.database || 'local';
    try {
      const ok = await provider.collectionExists('cases');
      return { ok: true, provider: name, connected: true };
    } catch (e) {
      const msg = e?.message || String(e);
      const authDenied = msg.includes('auth denied') || msg.includes('Auth error') || msg.includes('401') || msg.includes('403');
      return {
        ok: false, provider: name, connected: false, authDenied,
        error: authDenied ? 'Authentication denied — check API key and project URL.' : msg,
      };
    }
  },

  async testBackend(url, key, timeout = 8000) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      return { ok: res.ok || res.status < 500, status: res.status };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, error: 'Connection timed out — check your Project URL.' };
      return { ok: false, error: e?.message || 'Connection refused' };
    }
  },

  // Direct database connection test — routes through the backend gateway.
  // The frontend NEVER connects to a database directly; all privileged
  // operations happen server-side via the configured backend API.
  async testDirect(host, port, database, username, password) {
    if (!BackendGateway.configured) {
      return {
        ok: false,
        error: 'Backend not configured. Set VITE_BACKEND_URL to point to your API server, or use Simple Setup / Copy-Paste Setup instead.',
        needsBackend: true,
      };
    }
    const payload = { host, port, database, username, password };
    return BackendGateway.testDatabase(payload);
  },
};

export default ConnectionTester;
