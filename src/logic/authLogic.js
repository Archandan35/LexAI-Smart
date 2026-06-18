import { authService } from '@/services/authService.js';
import { userService } from '@/services/userService.js';
import { roleService } from '@/services/roleService.js';
import { auditService } from '@/services/auditService.js';
import { hashPassword } from '@/utils/crypto.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const authLogic = {
  async bootstrapAdmin({ name, email, password }) {
    try {
      const users = await userService.list();
      if (users.length > 0) {
        return fail('System is already bootstrapped. Super admin already exists.');
      }
      if (!email || !password || !name) {
        return fail('Name, email, and password are required.');
      }

      // 1. Create Supabase Auth user (required for remote providers)
      console.log('[Bootstrap] create auth user start');
      console.log('[Bootstrap] signup email:', email);
      console.log('[Bootstrap] signup password length:', password.length);
      let userId = 'user_superadmin';
      let emailConfirmed = false;
      try {
        const authUser = await authService.signUp(email.toLowerCase(), password);
        console.log('[Bootstrap] signup success, authUser:', JSON.stringify(authUser));
        if (authUser && authUser.id) {
          userId = authUser.id;
          emailConfirmed = !!authUser.email_confirmed_at;
          console.log('[Bootstrap] auth user id:', userId, 'email_confirmed_at:', authUser.email_confirmed_at);
        }
      } catch (authErr) {
        console.warn('[Bootstrap] create auth user failed:', authErr.message);
        return fail(`Failed to create auth account: ${authErr.message}. Ensure Supabase Auth sign-ups are enabled (Settings → Authentication → Sign up).`);
      }

      // 2. If email confirmation is required, don't attempt auto-login
      if (!emailConfirmed) {
        console.log('[Bootstrap] email confirmation required — skipping auto-login');
        return ok({
          user: { id: userId, email, name },
          emailConfirmationRequired: true,
          message: 'Account created successfully. Please confirm your email before logging in.',
        });
      }

      // 2.5. Create super_admin role if none exist (required for bootstrap)
      const existingRoles = await roleService.list();
      if (existingRoles.length === 0) {
        console.log('[Bootstrap] no roles found — creating super_admin role');
        await roleService.create({
          id: 'role_super_admin',
          code: 'super_admin',
          name: 'Super Admin',
          description: 'System super administrator',
          permissions: [],
          all: true,
          inheritsHierarchy: false,
          system: true,
          status: 'Active',
          createdAt: nowISO(),
        });
      }

      // 3. Create application user record
      console.log('[Bootstrap] create application user start');
      const { salt, hash } = await hashPassword(password);
      const user = await userService.create({
        id: userId,
        name,
        email: email.toLowerCase(),
        username: email.split('@')[0].toLowerCase(),
        roleCode: 'super_admin',
        status: 'Active',
        extraRoles: [],
        grants: [],
        denies: [],
        salt,
        passwordHash: hash,
        createdAt: nowISO(),
      });
      console.log('[Bootstrap] application user created:', user?.id);

      // 4. Auto-login to verify credentials
      console.log('[Bootstrap] auto login start');
      console.log('[Bootstrap] signin email:', email);
      console.log('[Bootstrap] signin password length:', password.length);
      const signInResult = await this.login(email.toLowerCase(), password);
      console.log('[Bootstrap] signin result ok:', signInResult?.ok);
      if (!signInResult.ok) {
        console.warn('[Bootstrap] auto login failed:', signInResult.error);
        return fail(`Bootstrap succeeded, but sign in failed: ${signInResult.error}`);
      }
      console.log('[Bootstrap] auto login succeeded');
      return ok({ session: signInResult.data.session, user: signInResult.data.user });
    } catch (e) {
      console.error('[Bootstrap] bootstrapAdmin error:', e);
      return fail(e);
    }
  },

  async login(identifier, password) {
    try {
      const { session, user } = await authService.signIn(identifier, password);
      await auditService.record({ action: 'auth.login', user, details: `Signed in (${identifier})` });
      return ok({ session, user });
    } catch (e) {
      return fail(e);
    }
  },

  async logout(user) {
    await authService.signOut();
    await auditService.record({ action: 'auth.logout', user, details: 'Signed out' });
    return ok(true);
  },

  async restore() {
    try {
      const result = await authService.getSession();
      return ok(result); // null when no active session
    } catch (e) {
      return fail(e);
    }
  },

  async forgotPassword(identifier) {
    try {
      return ok(await authService.requestPasswordReset(identifier));
    } catch (e) {
      return fail(e);
    }
  },
};

export default authLogic;
