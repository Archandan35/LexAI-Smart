import { userService } from '@/services/userService.js';
import { roleService } from '@/services/roleService.js';
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

// The Super Admin account is protected from deletion everywhere. Identify it by
// role (and the seeded id) so the guard holds even if the id scheme changes.
export const PROTECTED_ROLE = 'Admin';
export function isProtectedUser(u) {
  return !!u && (u.roleCode === PROTECTED_ROLE || u.id === 'user_admin');
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
      const roleCode = data.roleCode;

      const allRoles = await roleService.list();
      const roleExists = allRoles.some((r) => r.code === roleCode);
      if (!roleExists) return fail(`Role "${roleCode}" does not exist. Create it first in Role Management.`);

      let userId = undefined;
      try {
        const authUser = await authService.signUp(data.email.toLowerCase(), password);
        if (authUser && authUser.id) {
          userId = authUser.id;
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
      return ok(stripSecrets(row));
    } catch (e) {
      return fail(e);
    }
  },

  async update(id, patch, actor) {
    try {
      const clean = { ...patch };
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
      let deleted = 0;
      let skippedProtected = 0;
      let skippedSelf = 0;
      let failed = 0;
      for (const id of ids) {
        const u = byId[id];
        if (!u) { failed += 1; continue; }
        if (isProtectedUser(u)) { skippedProtected += 1; continue; }
        if (actor && id === actor.id) { skippedSelf += 1; continue; }
        // eslint-disable-next-line no-await-in-loop
        const okRem = await userService.remove(id);
        if (okRem) deleted += 1; else failed += 1;
      }
      await auditService.record({ action: 'user.bulkDelete', module: 'users', user: actor, details: `Deleted ${deleted} user(s); skipped ${skippedProtected + skippedSelf}; failed ${failed}` });
      return ok({ deleted, skippedProtected, skippedSelf, failed });
    } catch (e) {
      return fail(e);
    }
  },
};

export default userLogic;
