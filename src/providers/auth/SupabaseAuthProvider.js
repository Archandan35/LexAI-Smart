import AuthProvider from './AuthProvider.js';
import { config } from '@/config/config.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { EntityRegistry, FieldMapper } from '@/core/index.js';

const USERS_TABLE = () => EntityRegistry.providerTable('users');

// SupabaseAuthProvider — talks directly to the GoTrue REST API on Supabase.
// Handles session persistence, token refreshing, database user record linking.
// Session is held in-memory only (no localStorage) so it does not survive
// full page reloads. Auth tokens are ephemeral by design.
export default class SupabaseAuthProvider extends AuthProvider {
  #session = null;

  constructor() {
    super();
    this.url = config.credentials.supabaseUrl;
    this.key = config.credentials.supabaseAnonKey;
    if (!this.url || !this.key) {
      console.warn('[LexAI] Auth provider not configured; will fail on use.');
    }
  }

  #authBase() { return `${this.url}/auth/v1`; }

  #headers(token) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${token || this.key}`,
      'Content-Type': 'application/json',
    };
  }

  async signUp(email, password) {
    const res = await fetch(`${this.#authBase()}/signup`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.msg || err?.error_description || err?.error || `Signup failed: ${res.status}`);
    }
    const data = await res.json();
    return data.user;
  }

  async signIn(identifier, password) {
    const res = await fetch(`${this.#authBase()}/token?grant_type=password`, {
      method: 'POST', headers: this.#headers(), body: JSON.stringify({ email: identifier, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error_description || err?.error || 'Invalid credentials.');
    }
    const data = await res.json();
    const userId = data.user?.id;
    if (!userId) throw new Error('No user ID returned from auth provider.');

    // Verify / load database user record
    const db = getDatabaseProvider();
    let dbUser = await db.get(USERS_TABLE(), userId);

    if (!dbUser) {
      const usersList = await db.list(USERS_TABLE());
      const isFirst = usersList.length === 0;

      dbUser = {
        id: userId,
        name: data.user.email.split('@')[0],
        email: data.user.email,
        username: data.user.email.split('@')[0],
        roleCode: '',
        status: 'Active',
        extraRoles: [],
        grants: [],
        denies: [],
        createdAt: new Date().toISOString(),
      };
      await db.create(USERS_TABLE(), FieldMapper.toProvider('users', dbUser));
    } else {
      if (dbUser.status && dbUser.status !== 'Active') {
        throw new Error('This account is disabled. Contact an administrator.');
      }
      // Update last login (best-effort — non-critical for login to succeed)
      try {
        await db.update(USERS_TABLE(), userId, FieldMapper.toProvider('users', { lastLoginAt: new Date().toISOString() }));
      } catch { /* ignore — RLS may block anon UPDATE */ }
    }

    this.#session = { token: data.access_token, refreshToken: data.refresh_token, userId };

    const mapped = FieldMapper.toLexAI('users', dbUser);
    const { passwordHash, salt, ...safeUser } = mapped;
    return { session: this.#session, user: safeUser };
  }

  async signOut() {
    if (this.#session?.token) {
      try {
        await fetch(`${this.#authBase()}/logout`, {
          method: 'POST',
          headers: this.#headers(this.#session.token),
        });
      } catch (e) {
        // ignore network error
      }
    }
    this.#session = null;
    return true;
  }

  async getSession() {
    if (!this.#session) return null;

    try {
      // Verify token is active
      const res = await fetch(`${this.#authBase()}/user`, {
        method: 'GET',
        headers: this.#headers(this.#session.token),
      });

      if (res.ok) {
        const db = getDatabaseProvider();
        const dbUser = await db.get(USERS_TABLE(), this.#session.userId);
        if (!dbUser || (dbUser.status && dbUser.status !== 'Active')) {
          this.#session = null;
          return null;
        }
        const mapped = FieldMapper.toLexAI('users', dbUser);
        const { passwordHash, salt, ...safeUser } = mapped;
        return { session: this.#session, user: safeUser };
      }

      // Try refreshing if token has expired
      if (this.#session.refreshToken) {
        const refreshRes = await fetch(`${this.#authBase()}/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: this.#headers(),
          body: JSON.stringify({ refresh_token: this.#session.refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          this.#session = {
            token: refreshData.access_token,
            refreshToken: refreshData.refresh_token,
            userId: refreshData.user?.id || this.#session.userId,
          };

          const db = getDatabaseProvider();
          const dbUser = await db.get(USERS_TABLE(), this.#session.userId);
          if (!dbUser || (dbUser.status && dbUser.status !== 'Active')) {
            this.#session = null;
            return null;
          }
          const mapped2 = FieldMapper.toLexAI('users', dbUser);
          const { passwordHash: pw2, salt: s2, ...safeUser2 } = mapped2;
          return { session: this.#session, user: safeUser2 };
        }
      }
    } catch (e) {
      console.warn('[LexAI] Auth restore session failed:', e);
    }

    this.#session = null;
    return null;
  }

  async requestPasswordReset(identifier) {
    const res = await fetch(`${this.#authBase()}/recover`, {
      method: 'POST', headers: this.#headers(), body: JSON.stringify({ email: identifier }),
    });
    return { delivered: res.ok };
  }

  async changePassword(userId, newPassword) {
    if (!this.#session?.token) throw new Error('No active session.');

    const res = await fetch(`${this.#authBase()}/user`, {
      method: 'PUT', headers: this.#headers(this.#session.token), body: JSON.stringify({ password: newPassword }),
    });
    return res.ok;
  }
}
