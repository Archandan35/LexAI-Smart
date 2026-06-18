import AuthProvider from './AuthProvider.js';
import { config } from '@/config/config.js';
import { getDatabaseProvider } from '@/providers/database/index.js';

const SESSION_KEY = 'lexai.supabase.session.v1';

// SupabaseAuthProvider — talks directly to the GoTrue REST API on Supabase.
// Handles session persistence, token refreshing, database user record linking.
export default class SupabaseAuthProvider extends AuthProvider {
  constructor() {
    super();
    this.url = config.credentials.supabaseUrl;
    this.key = config.credentials.supabaseAnonKey;
    if (!this.url || !this.key) {
      console.warn('[LexAI] Supabase auth not configured; provider will fail on use.');
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

  #persistSession(session) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
  }

  #readSession() {
    try {
      const raw = typeof localStorage !== 'undefined' && localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  #clearSession() {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
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
    let dbUser = await db.get('users', userId);

    if (!dbUser) {
      // First login / missing DB record: create a synchronized user record in database.
      const usersList = await db.list('users');
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
      await db.create('users', dbUser);
    } else {
      if (dbUser.status && dbUser.status !== 'Active') {
        throw new Error('This account is disabled. Contact an administrator.');
      }
      // Update last login
      await db.update('users', userId, { lastLoginAt: new Date().toISOString() });
    }

    const session = { token: data.access_token, refreshToken: data.refresh_token, userId };
    this.#persistSession(session);

    const { passwordHash, salt, ...safeUser } = dbUser;
    return { session, user: safeUser };
  }

  async signOut() {
    const session = this.#readSession();
    if (session && session.token) {
      try {
        await fetch(`${this.#authBase()}/logout`, {
          method: 'POST',
          headers: this.#headers(session.token),
        });
      } catch (e) {
        // ignore network error
      }
    }
    this.#clearSession();
    return true;
  }

  async getSession() {
    const session = this.#readSession();
    if (!session) return null;

    try {
      // Verify token is active
      const res = await fetch(`${this.#authBase()}/user`, {
        method: 'GET',
        headers: this.#headers(session.token),
      });

      if (res.ok) {
        const db = getDatabaseProvider();
        const dbUser = await db.get('users', session.userId);
        if (!dbUser || (dbUser.status && dbUser.status !== 'Active')) {
          this.#clearSession();
          return null;
        }
        const { passwordHash, salt, ...safeUser } = dbUser;
        return { session, user: safeUser };
      }

      // Try refreshing if token has expired
      if (session.refreshToken) {
        const refreshRes = await fetch(`${this.#authBase()}/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: this.#headers(),
          body: JSON.stringify({ refresh_token: session.refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newSession = {
            token: refreshData.access_token,
            refreshToken: refreshData.refresh_token,
            userId: refreshData.user?.id || session.userId,
          };
          this.#persistSession(newSession);

          const db = getDatabaseProvider();
          const dbUser = await db.get('users', newSession.userId);
          if (!dbUser || (dbUser.status && dbUser.status !== 'Active')) {
            this.#clearSession();
            return null;
          }
          const { passwordHash, salt, ...safeUser } = dbUser;
          return { session: newSession, user: safeUser };
        }
      }
    } catch (e) {
      console.warn('[LexAI] Supabase restore session failed:', e);
    }

    this.#clearSession();
    return null;
  }

  async requestPasswordReset(identifier) {
    const res = await fetch(`${this.#authBase()}/recover`, {
      method: 'POST', headers: this.#headers(), body: JSON.stringify({ email: identifier }),
    });
    return { delivered: res.ok };
  }

  async changePassword(userId, newPassword) {
    const session = this.#readSession();
    const token = session?.token;
    if (!token) throw new Error('No active session.');

    const res = await fetch(`${this.#authBase()}/user`, {
      method: 'PUT', headers: this.#headers(token), body: JSON.stringify({ password: newPassword }),
    });
    return res.ok;
  }
}
