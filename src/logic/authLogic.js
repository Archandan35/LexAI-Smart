import { authService } from '@/services/authService.js';
import { userService } from '@/services/userService.js';
import { roleService } from '@/services/roleService.js';
import { auditService } from '@/services/auditService.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { ROLE_TEMPLATES } from '@/constants/permissions.js';
import { hashPassword } from '@/utils/crypto.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

export const authLogic = {
  // Ensure roles exist. Idempotent; safe to call on boot.
  async ensureSeeded() {
    try {
      // Universal install step: make sure the active provider's collections/
      // tables exist before we seed into them. On `local` this creates the blob
      // arrays; on lazy backends (mongo/firebase) it's a reachability check; on
      // supabase it surfaces any tables that still need their one-time SQL.
      try { await databaseAdminService.ensureSchema({ coreOnly: true }); }
      catch { /* never block boot on a migration probe */ }

      const roles = await roleService.list();
      if (!roles.length) {
        for (const tpl of Object.values(ROLE_TEMPLATES)) {
          if (tpl.code === 'custom') continue;
          await roleService.create({
            id: `role_${tpl.code}`,
            code: tpl.code,
            name: tpl.name,
            description: tpl.description,
            permissions: tpl.permissions,
            all: !!tpl.all,
            inheritsHierarchy: true,
            system: true,
            status: 'Active',
            createdAt: nowISO(),
          });
        }
      }
      return ok({ seeded: true });
    } catch (e) {
      return fail(e);
    }
  },

  async bootstrapAdmin({ name, email, password }) {
    try {
      const users = await userService.list();
      if (users.length > 0) {
        return fail('System is already bootstrapped. Super admin already exists.');
      }
      if (!email || !password || !name) {
        return fail('Name, email, and password are required.');
      }

      let userId = 'user_superadmin';
      if (authService.signUp) {
        try {
          const authUser = await authService.signUp(email.toLowerCase(), password);
          if (authUser && authUser.id) {
            userId = authUser.id;
          }
        } catch (authErr) {
          console.warn('[LexAI] Auth provider signup failed or skipped:', authErr);
        }
      }

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

      const signInResult = await this.login(email.toLowerCase(), password);
      if (!signInResult.ok) {
        return fail(`Bootstrap succeeded, but sign in failed: ${signInResult.error}`);
      }
      return ok({ session: signInResult.data.session, user: signInResult.data.user });
    } catch (e) {
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
