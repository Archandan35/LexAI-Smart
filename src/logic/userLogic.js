import { userService } from '@/services/userService.js';
import { roleService } from '@/services/roleService.js';
import { roleLogic, SEED_SUPER_ROLE } from '@/logic/roleLogic.js';
import { auditService } from '@/services/auditService.js';
import { authService } from '@/services/authService.js';
import { rbacLogic } from './rbacLogic.js';
import { hashPassword } from '@/utils/crypto.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

function stripSecrets(u) {
  if (!u) return u;
  const { passwordHash, salt, ...safe } = u;
  return safe;
}

// The Super Admin account is protected from deletion everywhere. A user is
// "protected" when their role (or any extra role) is a Super Admin role — i.e. a
// role whose `all` flag is set in the UI — or the seeded bootstrap account id.
// No role name is hardcoded; protection follows the role's data.
export function isProtectedUser(u, roles = []) {
  if (!u) return false;
  if (u.id === 'user_admin') return true;
  const byCode = Object.fromEntries((roles || []).map((r) => [r.code, r]));
  const codes = [u.roleCode, ...(u.extraRoles || [])].filter(Boolean);
  return codes.some((c) => byCode[c]?.all === true);
}

export const userLogic = {
  async list() {
    const [users, roles] = await Promise.all([userService.list(), roleService.list()]);
    const byCode = Object.fromEntries(roles.map((r) => [r.code, r]));
    return users.map((u) => ({
      ...stripSecrets(u),
      roleName: byCode[u.roleCode]?.name || u.roleCode || '—',
      permissionCount: rbacLogic.resolve(u, roles).permissions.size,
    }));
  },

  async get(id) {
    const u = await userService.get(id);
    return stripSecrets(u);
  },

  async create(data, actor) {
    try {
      if (!data.email && !data.username) return fail('Email or username is required.');
      if (!data.password) return fail('Password is required.');
      const password = data.password;
      // roleCode may be omitted on the public signup form (no selectable roles
      // yet). When omitted, resolve the super-admin role by AUTHORITY (the `all`
      // flag), never by a hardcoded name.
      let roleCode = data.roleCode || (await roleLogic.getSuperAdminRoleCode());

      // Existing user count — used to decide first-account bootstrap and to
      // block self-service admin assignment after install.
      const { ok: usersOk, data: existingUsers } = await userService.list()
        .then((u) => ({ ok: true, data: u })).catch(() => ({ ok: false, data: [] }));
      const userCount = usersOk ? (existingUsers || []).length : 0;
      const isFirstAccount = userCount === 0;

      const allRoles = await roleService.list();
      const roleExists = allRoles.some((r) => r.code === roleCode);
      // SECURITY: never let a caller self-assign a Super Admin role (any role
      // whose `all` flag is set in the UI) once any user already exists. Super
      // Admin must be granted by an existing administrator in-app.
      if (!isFirstAccount) {
        const targetRole = allRoles.find((r) => r.code === roleCode);
        if (targetRole?.all) {
          return fail('System Owner role cannot be self-assigned. Contact an existing System Owner.');
        }
      }
      // First-account bootstrap: if the requested role is missing and this is
      // the very first account, auto-provision it with FULL access so the
      // initial administrator always succeeds. Subsequent accounts must use a
      // role that already exists in Role Management.
      if (!roleExists) {
        if (isFirstAccount) {
          const created = await roleService.create({ ...SEED_SUPER_ROLE, createdAt: nowISO() });
          if (!created) return fail('Failed to provision the initial System Owner role.');
          roleCode = created.code;
        } else {
          return fail(`Role "${roleCode}" does not exist. Create it first in Role Management.`);
        }
      }

      let userId = undefined;
      let emailConfirmationRequired = false;
      try {
        const authUser = await authService.signUp(data.email.toLowerCase(), password);
        if (authUser && authUser.id) {
          userId = authUser.id;
        }
        if (authUser && authUser.emailConfirmationRequired) {
          emailConfirmationRequired = true;
        }
      } catch (authErr) {
        console.warn('[LexAI] External auth signup skipped or failed:', authErr);
      }

      const { salt, hash } = await hashPassword(password);
      const row = await userService.create({
        id: userId,
        name: data.name || data.email || data.username,
        email: (data.email || '').toLowerCase(),
        username: (data.username || '').toLowerCase(),
        phone: data.phone,
        address: data.address,
        roleCode,
        extraRoles: data.extraRoles || [],
        grants: [], denies: [],
        status: data.status || 'Active',
        salt, passwordHash: hash,
        createdAt: nowISO(),
      });
      await auditService.record({ action: 'user.create', module: 'users', user: actor, details: `Created user ${row.email || row.username}` });

      // If Supabase requires email confirmation, stop here and tell the user to
      // confirm — do NOT attempt an auto-login (it would fail with a misleading
      // "wrong credentials" error).
      if (emailConfirmationRequired) {
        return ok({
          user: stripSecrets(row),
          emailConfirmationRequired: true,
          message: 'Account created. Please confirm your email before signing in.',
        });
      }
      return ok(stripSecrets(row));
    } catch (e) {
      return fail(e);
    }
  },

  async update(id, patch, actor) {
    try {
      const clean = { ...patch };
      const newPassword = clean.password;
      if (clean.password) {
        const { salt, hash } = await hashPassword(clean.password);
        clean.salt = salt; clean.passwordHash = hash;
        delete clean.password;
      }
      if (clean.email) clean.email = clean.email.toLowerCase();
      if (clean.username) clean.username = clean.username.toLowerCase();
      const row = await userService.update(id, clean);
      // A provider can return 200 OK at the transport level yet match zero
      // rows (wrong id, RLS policy, race with a delete) — that is a failed
      // update, not a successful one with empty data.
      if (!row) return fail('Update failed — the user could not be found or updated.');
      await auditService.record({ action: 'user.update', module: 'users', user: actor, details: `Updated user ${id}` });
      return ok(stripSecrets(row));
    } catch (e) {
      return fail(e);
    }
  },

  async remove(id, actor) {
    try {
      const target = await userService.get(id);
      if (!target) return fail('User not found.');
      if (isProtectedUser(target)) return fail('The Super Admin account is protected and cannot be deleted.');
      if (actor && id === actor.id) return fail('You cannot delete your own account.');
      // The provider returns false when the row is not actually removed — surface
      // that instead of reporting a false success.
      const deleted = await userService.remove(id);
      if (!deleted) return fail('Delete failed — the user could not be removed.');
      await auditService.record({ action: 'user.delete', module: 'users', user: actor, details: `Deleted user ${target.email || target.username || id}` });
      return ok({ deleted: 1 });
    } catch (e) {
      return fail(e);
    }
  },

  async setRole(id, roleCode, actor) {
    const allRoles = await roleService.list();
    const roleExists = allRoles.some((r) => r.code === roleCode);
    if (!roleExists) return fail(`Role "${roleCode}" does not exist. Create it first in Role Management.`);
    return this.update(id, { roleCode }, actor);
  },

  async setStatus(id, status, actor) {
    try {
      const row = await userService.update(id, { status });
      if (!row) return fail('Status update failed — the user could not be found or updated.');
      await auditService.record({ action: 'user.status', module: 'users', user: actor, details: `Set ${id} → ${status}` });
      return ok(stripSecrets(row));
    } catch (e) {
      return fail(e);
    }
  },

  // Bulk delete with truthful reporting. Protected (Super Admin) and self
  // accounts are skipped, never deleted. Returns real counts so the UI can show
  // an accurate result instead of an unconditional "success".
  async bulkRemove(ids, actor) {
    try {
      const all = await userService.list();
      const byId = Object.fromEntries(all.map((u) => [u.id, u]));
      const results = await Promise.allSettled(ids.map(async (id) => {
        const u = byId[id];
        if (!u) return 'failed';
        if (isProtectedUser(u)) return 'skippedProtected';
        if (actor && id === actor.id) return 'skippedSelf';
        const okRem = await userService.remove(id);
        return okRem ? 'deleted' : 'failed';
      }));
      let deleted = 0;
      let skippedProtected = 0;
      let skippedSelf = 0;
      let failed = 0;
      for (const r of results) {
        if (r.status === 'rejected') { failed += 1; continue; }
        if (r.value === 'deleted') deleted += 1;
        else if (r.value === 'skippedProtected') skippedProtected += 1;
        else if (r.value === 'skippedSelf') skippedSelf += 1;
        else failed += 1;
      }
      await auditService.record({ action: 'user.bulkDelete', module: 'users', user: actor, details: `Deleted ${deleted} user(s); skipped ${skippedProtected + skippedSelf}; failed ${failed}` });
      return ok({ deleted, skippedProtected, skippedSelf, failed });
    } catch (e) {
      return fail(e);
    }
  },
};

export default userLogic;
