// AuthProvider — authentication contract. Implemented by local/supabase/etc.
// The auth service is the ONLY caller; pages never touch this directly.
export default class AuthProvider {
  // eslint-disable-next-line no-unused-vars
  async signIn(identifier, password) { throw new Error('not implemented'); }
  async signOut() { throw new Error('not implemented'); }
  // Returns the persisted session (or null) without prompting credentials.
  async getSession() { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async requestPasswordReset(identifier) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async changePassword(userId, newPassword) { throw new Error('not implemented'); }
  // eslint-disable-next-line no-unused-vars
  async adminChangePassword(userId, newPassword) { throw new Error('not implemented'); }
}
