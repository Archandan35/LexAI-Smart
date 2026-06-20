import AuthProvider from './AuthProvider.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { hashPassword, verifyPassword, randomHex } from '@/utils/crypto.js';
import { nowISO } from '@/utils/id.js';
import { EntityRegistry, FieldMapper } from '@/core/index.js';

const SESSION_KEY = 'lexai.session.v1';
const USERS_TABLE = () => EntityRegistry.providerTable('users');

// LocalAuthProvider — credential auth against the `users` collection in the
// active DatabaseProvider, with the session persisted in localStorage. DEMO-grade
// (no backend): see utils/crypto.js. Swap VITE_AUTH_PROVIDER=supabase for real auth.
export default class LocalAuthProvider extends AuthProvider {
  #db() { return getDatabaseProvider(); }

  async #findUser(identifier) {
    const id = String(identifier || '').trim().toLowerCase();
    const users = await this.#db().list(USERS_TABLE());
    return users.find(
      (u) => (u.email || '').toLowerCase() === id || (u.username || '').toLowerCase() === id
    ) || null;
  }

  async signIn(identifier, password) {
    const user = await this.#findUser(identifier);
    if (!user) throw new Error('No account found for those credentials.');
    if (user.status && user.status !== 'Active') throw new Error('This account is disabled. Contact an administrator.');
    const valid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!valid) throw new Error('Incorrect password.');

    await this.#db().update(USERS_TABLE(), user.id, FieldMapper.toProvider('users', { lastLoginAt: nowISO() }));
    const token = randomHex(24);
    const session = { token, userId: user.id, issuedAt: nowISO() };
    this.#persistSession(session);
    return { session, user: stripSecrets(user) };
  }

  async signOut() {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    return true;
  }

  async getSession() {
    const session = this.#readSession();
    if (!session) return null;
    const user = await this.#db().get(USERS_TABLE(), session.userId);
    if (!user || (user.status && user.status !== 'Active')) {
      await this.signOut();
      return null;
    }
    return { session, user: stripSecrets(user) };
  }

  async requestPasswordReset(identifier) {
    // No backend / email transport. Surface a deterministic demo token so the
    // ForgotPassword flow is fully runnable offline.
    const user = await this.#findUser(identifier);
    const token = randomHex(8);
    return { delivered: !!user, token, message: user ? 'Reset token generated (demo).' : 'If the account exists, a reset token was generated.' };
  }

  async changePassword(userId, newPassword) {
    const { salt, hash } = await hashPassword(newPassword);
    await this.#db().update(USERS_TABLE(), userId, FieldMapper.toProvider('users', { salt, passwordHash: hash, passwordUpdatedAt: nowISO() }));
    return true;
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
}

function stripSecrets(user) {
  if (!user) return user;
  const { passwordHash, salt, ...safe } = user;
  return safe;
}
