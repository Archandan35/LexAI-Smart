import AuthProvider from './AuthProvider.js';
import { config } from '@/config/config.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { EntityRegistry, FieldMapper } from '@/core/index.js';
import { verifyPassword } from '@/utils/crypto.js';

const USERS_TABLE = () => EntityRegistry.providerTable('users');
const STORAGE_KEY = 'lexai.auth.session';
const LOCAL_SESSION_TOKEN = '__local_session__';

async function lookupUserByIdentifier(db, identifier) {
  const users = await db.list(USERS_TABLE());
  return users.find((u) => u.email === identifier || u.username === identifier) || null;
}

// SupabaseAuthProvider — talks directly to the GoTrue REST API on Supabase.
// Handles session persistence, token refreshing, database user record linking.
// Session is persisted to sessionStorage (not localStorage) so it is
// automatically cleared when the user closes the browser tab, reducing the
// window of exposure if the device is shared or compromised.
export default class SupabaseAuthProvider extends AuthProvider {
  #session = null;

  // 30-minute session expiry for access tokens without explicit expiry
  #SESSION_MAX_AGE_MS = 30 * 60 * 1000;

  #persist(session) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch {}
  }

  #clearPersisted() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }

  #loadPersisted() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.token) return null;
      return parsed;
    } catch { return null; }
  }

  constructor() {
    super();
    this.url = config.credentials.supabaseUrl;
    this.key = config.credentials.supabaseAnonKey;
    if (!this.url || !this.key) {
      console.warn('[LexAI] Auth provider not configured; will fail on use.');
    }
    this._rateLimitMap = new Map();
  }

  #authBase() { return `${this.url}/auth/v1`; }

  #headers(token) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${token || this.key}`,
      'Content-Type': 'application/json',
    };
  }

  #checkRateLimit(key) {
    const now = Date.now();
    const windowMs = 60000;
    const maxAttempts = 5;
    const entry = this._rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
    } else {
      entry.count++;
    }
    this._rateLimitMap.set(key, entry);
    if (entry.count > maxAttempts) {
      throw new Error(`Too many attempts. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`);
    }
  }

  async signUp(email, password) {
    this.#checkRateLimit(`signup:${email}`);
    const res = await fetch(`${this.#authBase()}/signup`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify({ email, password }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      if (!contentType.includes('application/json')) {
        throw new Error(`Auth signup failed (${res.status}). The Supabase Auth endpoint returned a non-JSON response — check that VITE_SUPABASE_URL is correct and CORS allows this origin in Supabase Dashboard → API → CORS.`);
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.msg || err?.error_description || err?.error || `Signup failed: ${res.status}`);
    }
    const data = contentType.includes('application/json') ? await res.json() : {};
    const user = data.user || {};
    // When Supabase has "Confirm email" enabled (free-tier default), signup
    // succeeds but no session is issued until the user confirms. Surface this
    // so the UI can tell the user to check their inbox instead of failing the
    // auto-login with a misleading "wrong credentials" error.
    const emailConfirmed = !!user.email_confirmed_at || !!data.session;
    return {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      session: data.session || null,
      emailConfirmationRequired: !emailConfirmed,
    };
  }

  async signIn(identifier, password) {
    this.#checkRateLimit(`signin:${identifier}`);
    const db = getDatabaseProvider();

    let supabaseSessionData = null;
    let userId = null;
    let isLocalAuth = false;

    // Try Supabase Auth first
    const res = await fetch(`${this.#authBase()}/token?grant_type=password`, {
      method: 'POST', headers: this.#headers(), body: JSON.stringify({ email: identifier, password }),
    });
    const contentType = res.headers.get('content-type') || '';

    if (res.ok) {
      supabaseSessionData = contentType.includes('application/json') ? await res.json() : {};
      userId = supabaseSessionData?.user?.id;
    }

    // If Supabase Auth failed, try local password verification
    if (!userId) {
      const localUser = await lookupUserByIdentifier(db, identifier.toLowerCase());
      if (localUser && localUser.passwordHash && localUser.salt) {
        const match = await verifyPassword(password, localUser.salt, localUser.passwordHash);
        if (match) {
          userId = localUser.id;
          isLocalAuth = true;
        }
      }
    }

    if (!userId) {
      throw new Error('Invalid credentials.');
    }

    // Load DB user record
    let dbUser = await db.get(USERS_TABLE(), userId);

    if (!dbUser) {
      const usersList = await db.list(USERS_TABLE());
      const isFirst = usersList.length === 0;

      dbUser = {
        id: userId,
        name: (supabaseSessionData?.user?.email || identifier).split('@')[0],
        email: supabaseSessionData?.user?.email || identifier,
        username: (supabaseSessionData?.user?.email || identifier).split('@')[0],
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
        throw new Error('This account is disabled. Contact a System Owner.');
      }
      try {
        await db.update(USERS_TABLE(), userId, FieldMapper.toProvider('users', { lastLoginAt: new Date().toISOString() }));
      } catch { /* ignore */ }
    }

    this.#session = {
      token: supabaseSessionData?.access_token || LOCAL_SESSION_TOKEN,
      refreshToken: supabaseSessionData?.refresh_token || LOCAL_SESSION_TOKEN,
      userId,
      storedAt: Date.now(),
      local: isLocalAuth,
    };
    this.#persist(this.#session);

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
    this.#clearPersisted();
    return true;
  }

  async #loadDbUser(userId) {
    try {
      const db = getDatabaseProvider();
      const dbUser = await db.get(USERS_TABLE(), userId);
      if (!dbUser || (dbUser.status && dbUser.status !== 'Active')) return null;
      const mapped = FieldMapper.toLexAI('users', dbUser);
      const { passwordHash, salt, ...safeUser } = mapped;
      return safeUser;
    } catch {
      return null;
    }
  }

  async getSession() {
    if (!this.#session) {
      const persisted = this.#loadPersisted();
      if (persisted?.token && persisted?.userId) {
        if (persisted.storedAt && Date.now() - persisted.storedAt > this.#SESSION_MAX_AGE_MS) {
          this.#clearPersisted();
          return null;
        }
        this.#session = persisted;
      } else {
        return null;
      }
    }

    // Local sessions skip Supabase token verification
    if (this.#session.local) {
      const user = await this.#loadDbUser(this.#session.userId);
      if (!user) {
        this.#session = null;
        this.#clearPersisted();
        return null;
      }
      return { session: this.#session, user };
    }

    try {
      const res = await fetch(`${this.#authBase()}/user`, {
        method: 'GET',
        headers: this.#headers(this.#session.token),
      });

      if (res.ok) {
        const user = await this.#loadDbUser(this.#session.userId);
        if (!user) {
          this.#session = null;
          this.#clearPersisted();
          return null;
        }
        return { session: this.#session, user };
      }

      if (this.#session.refreshToken && this.#session.refreshToken !== LOCAL_SESSION_TOKEN) {
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
            storedAt: Date.now(),
            local: false,
          };
          this.#persist(this.#session);

          const user = await this.#loadDbUser(this.#session.userId);
          if (!user) {
            this.#session = null;
            this.#clearPersisted();
            return null;
          }
          return { session: this.#session, user };
        }
      }
    } catch (e) {
      console.warn('[LexAI] Auth restore session failed:', e);
    }

    this.#session = null;
    this.#clearPersisted();
    return null;
  }

  async requestPasswordReset(identifier) {
    this.#checkRateLimit(`reset:${identifier}`);
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
