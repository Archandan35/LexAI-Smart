import { getDatabaseProvider } from '@/providers/database/index.js';
import { config } from '@/config/config.js';

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
        ok: false,
        provider: name,
        connected: false,
        authDenied,
        error: authDenied ? 'Authentication denied — check API key and project URL.' : msg,
      };
    }
  },

  async testBackend(url, key) {
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      return { ok: res.ok || res.status < 500, status: res.status };
    } catch (e) {
      return { ok: false, error: e?.message || 'Connection refused' };
    }
  },

  async testDirect(host, port, database, username, password) {
    const payload = { host, port, database, username, password };
    try {
      const res = await fetch('/api/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { ok: res.ok, ...data };
    } catch {
      return { ok: false, error: 'Backend API unavailable — direct connection requires a server-side API.' };
    }
  },
};

export default ConnectionTester;
