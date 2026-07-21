import { authService } from '@/services/authService.js';
import { userService } from '@/services/userService.js';
import { roleService } from '@/services/roleService.js';
import { SEED_SUPER_ROLE, roleLogic } from '@/logic/roleLogic.js';
import { auditService } from '@/services/auditService.js';
import { getDatabaseProvider } from '@/providers/database/index.js';
import { hashPassword } from '@/utils/crypto.js';
import { ok, fail } from '@/utils/result.js';
import { DateEngine, FieldMapper } from '@/core/index.js';

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
      let userId = 'user_admin';
      let emailConfirmed = false;
      try {
        const authUser = await authService.signUp(email.toLowerCase(), password);
        if (authUser && authUser.id) {
          userId = authUser.id;
          emailConfirmed = !!authUser.email_confirmed_at;
        }
      } catch (authErr) {
        return fail(`Failed to create auth account: ${authErr.message}. Ensure Auth sign-ups are enabled (Settings → Authentication → Sign up).`);
      }

      // 2.5. Create the super-admin role if none exist (required for bootstrap).
      // Authority is resolved by the role's `all` flag, never by its name.
      const existingRoles = await roleService.list();
      let seedRoleCode = null;
      if (existingRoles.length === 0) {
        const seedRole = await roleService.create({ ...SEED_SUPER_ROLE, createdAt: DateEngine.now() });
        seedRoleCode = seedRole.code;
      } else {
        seedRoleCode = await roleLogic.getSuperAdminRoleCode();
      }

      // 3. Create application user record (Admin). Done BEFORE the email-
      // confirmation early-return so the admin role is preserved even when the
      // user must confirm their email before first sign-in.
      const { salt, hash } = await hashPassword(password);
      const userRecord = {
        id: userId,
        name,
        email: email.toLowerCase(),
        username: email.split('@')[0].toLowerCase(),
        roleCode: seedRoleCode,
        status: 'Active',
        extraRoles: [],
        grants: [],
        denies: [],
        salt,
        passwordHash: hash,
        lastLoginAt: DateEngine.now(),
        createdAt: DateEngine.now(),
      };
      let user;
      try {
        user = await userService.create(userRecord);
      } catch (createErr) {
        const db = getDatabaseProvider();
        if (typeof db.execSql === 'function') {
          const providerRecord = FieldMapper.toProvider('users', userRecord);
          const columns = Object.keys(providerRecord).map((k) => `"${k}"`).join(', ');
          const values = Object.values(providerRecord).map((v) => {
            if (v === null) return 'null';
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
            if (typeof v === 'boolean') return v ? 'true' : 'false';
            return `'${String(v).replace(/'/g, "''")}'`;
          }).join(', ');
          const sql = `insert into users (${columns}) values (${values}) returning *;`;
          const result = await db.execSql(sql);
          if (result.ok && result.data && result.data[0]) {
            user = result.data[0];
          }
        }
        if (!user) throw createErr;
      }

      // 3.5. If email confirmation is required, don't attempt auto-login.
      // The Admin DB user was already created above so the role is preserved;
      // the user simply confirms their email then signs in normally.
      if (!emailConfirmed) {
        return ok({
          user: { id: userId, email, name },
          emailConfirmationRequired: true,
          message: 'Account created successfully. Please confirm your email before logging in.',
        });
      }

      // 4. Auto-login to verify credentials
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
