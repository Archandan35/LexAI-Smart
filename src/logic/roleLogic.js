import { roleService } from '@/services/roleService.js';
import { userService } from '@/services/userService.js';
import { auditService } from '@/services/auditService.js';
import { ROLE_TEMPLATES } from '@/constants/permissions.js';
import { nowISO } from '@/utils/id.js';
import { ok, fail } from '@/utils/result.js';

function slugCode(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `role_${Date.now()}`;
}

export const roleLogic = {
  async list() {
    const [roles, users] = await Promise.all([roleService.list(), userService.list()]);
    return roles.map((r) => ({
      ...r,
      userCount: users.filter((u) => u.roleCode === r.code || (u.extraRoles || []).includes(r.code)).length,
      permissionCount: r.all ? Infinity : (r.permissions || []).length,
    }));
  },

  get: (id) => roleService.get(id),

  byCode: async (code) => {
    const roles = await roleService.list();
    return roles.find((r) => r.code === code) || null;
  },

  async create(data, actor) {
    try {
      const name = (data.name || '').trim();
      if (!name) return fail('Role name is required.');
      const code = (data.code && data.code.trim()) || slugCode(name);
      const existing = await this.byCode(code);
      if (existing) return fail(`A role with code "${code}" already exists.`);
      const tpl = ROLE_TEMPLATES[data.template] || ROLE_TEMPLATES.custom;
      const row = await roleService.create({
        code,
        name,
        description: data.description || tpl.description || '',
        permissions: data.permissions || tpl.permissions || [],
        all: !!data.all,
        inheritsHierarchy: data.inheritsHierarchy !== false,
        system: false,
        status: data.status || 'Active',
        createdAt: nowISO(),
      });
      await auditService.record({ action: 'role.create', module: 'roles', user: actor, details: `Created role ${name}` });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async update(id, patch, actor) {
    try {
      const row = await roleService.update(id, patch);
      if (!row) return fail('Update failed — the role could not be found or updated.');
      await auditService.record({ action: 'role.update', module: 'roles', user: actor, details: `Updated role ${row.name || id}` });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async remove(id, actor) {
    try {
      const role = await roleService.get(id);
      if (!role) return fail('Role not found.');
      if (role.system) return fail('System roles cannot be deleted.');
      const users = await userService.list();
      const inUse = users.filter((u) => u.roleCode === role.code || (u.extraRoles || []).includes(role.code)).length;
      if (inUse) return fail(`Cannot delete: ${inUse} user(s) still assigned to this role.`);
      const removed = await roleService.remove(id);
      if (!removed) return fail('Delete failed — the role could not be removed.');
      await auditService.record({ action: 'role.delete', module: 'roles', user: actor, details: `Deleted role ${role.name || id}` });
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  },

  async duplicate(id, actor) {
    try {
      const role = await roleService.get(id);
      if (!role) return fail('Role not found.');
      const base = `${role.name} (Copy)`;
      return this.create({
        name: base,
        code: slugCode(base),
        description: role.description,
        permissions: [...(role.permissions || [])],
        inheritsHierarchy: role.inheritsHierarchy,
      }, actor);
    } catch (e) {
      return fail(e);
    }
  },

  async setStatus(id, status, actor) {
    return this.update(id, { status }, actor);
  },

  async setEnabled(id, enabled, actor) {
    return this.update(id, { status: enabled ? 'Active' : 'Disabled' }, actor);
  },

  async clonePermissionsFrom(targetId, sourceCode, actor) {
    try {
      const roles = await roleService.list();
      const source = roles.find((r) => r.code === sourceCode);
      if (!source) return fail('Source role not found.');
      const row = await roleService.update(targetId, { permissions: [...(source.permissions || [])], all: !!source.all });
      await auditService.record({ action: 'role.clonePerms', module: 'roles', user: actor, details: `Cloned perms from ${sourceCode}` });
      return ok(row);
    } catch (e) {
      return fail(e);
    }
  },

  async bulkSetStatus(ids, status, actor) {
    try {
      for (const id of ids) await roleService.update(id, { status });
      await auditService.record({ action: 'role.bulkStatus', module: 'roles', user: actor, details: `${ids.length} roles → ${status}` });
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  },

  async bulkRemove(ids, actor) {
    try {
      let deleted = 0;
      let skippedSystem = 0;
      let skippedInUse = 0;
      let failed = 0;

      const users = await userService.list();
      for (const id of ids) {
        const role = await roleService.get(id);
        if (!role) { failed += 1; continue; }
        if (role.system) { skippedSystem += 1; continue; }

        const inUse = users.filter((u) => u.roleCode === role.code || (u.extraRoles || []).includes(role.code)).length;
        if (inUse) { skippedInUse += 1; continue; }

        const okRem = await roleService.remove(id);
        if (okRem) deleted += 1; else failed += 1;
      }

      await auditService.record({ action: 'role.bulkDelete', module: 'roles', user: actor, details: `Deleted ${deleted} role(s); skipped System: ${skippedSystem}, In-Use: ${skippedInUse}; failed ${failed}` });
      return ok({ deleted, skippedSystem, skippedInUse, failed });
    } catch (e) {
      return fail(e);
    }
  },
};

export default roleLogic;
