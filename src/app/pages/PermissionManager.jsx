import React, { useEffect, useMemo, useState } from 'react';
import { useRoles } from '@/hooks/useRoles.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { permissionService } from '@/services/permissionService.js';
import { userLogic } from '@/logic/userLogic.js';
import { roleLogic } from '@/logic/roleLogic.js';
import { rbacLogic } from '@/logic/rbacLogic.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import PermissionMatrix from '@/components/PermissionMatrix.jsx';
import { Field, Select } from '@/components/Field.jsx';
import { PERM_SOURCE } from '@/constants/permissions.js';

// PermissionManager — two modes:
//  Mode 1 (role): edit a role's permissions directly.
//  Mode 2 (user): see role-inherited perms + add custom grants / explicit denies.
export default function PermissionManager() {
  const { roles, refresh } = useRoles();
  const { user: actor, loadRoles, roles: liveRoles } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();

  const [mode, setMode] = useState('role');
  const [roleCode, setRoleCode] = useState('');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [rolePerms, setRolePerms] = useState(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState(null); // selected user record

  useEffect(() => { userLogic.list().then(setUsers); }, []);

  // ---- Role mode ----
  const selectedRole = roles.find((r) => r.code === roleCode);
  useEffect(() => {
    setRolePerms(new Set(selectedRole?.permissions || []));
    setDirty(false);
  }, [roleCode]); // eslint-disable-line

  const toggleRolePerm = (perm, next) => {
    setRolePerms((prev) => { const s = new Set(prev); if (next) s.add(perm); else s.delete(perm); return s; });
    setDirty(true);
  };
  const saveRole = async () => {
    setSaving(true);
    await permissionService.setRolePermissions(selectedRole.id, [...rolePerms]);
    setSaving(false); setDirty(false);
    toast.push('Role permissions saved.', 'success');
    await refresh(); await loadRoles();
  };

  // ---- User mode ----
  useEffect(() => {
    const u = users.find((x) => x.id === userId) || null;
    setTarget(u);
  }, [userId, users]);

  const userResolved = useMemo(() => (target ? rbacLogic.resolve(target, liveRoles) : null), [target, liveRoles]);

  const toggleUserPerm = async (perm, next) => {
    if (!target) return;
    const source = userResolved.sourceOf(perm);
    // Cycle behaviour: checking grants/clears-deny; unchecking a role-inherited perm = explicit deny.
    if (next) {
      await permissionService.grantUserPermission(target.id, perm);
    } else if (source === PERM_SOURCE.INHERITED) {
      await permissionService.denyUserPermission(target.id, perm);
    } else {
      await permissionService.clearUserOverride(target.id, perm);
    }
    const fresh = await userLogic.list();
    setUsers(fresh);
    setTarget(fresh.find((x) => x.id === target.id) || null);
  };

  const clearOverride = async (perm) => {
    await permissionService.clearUserOverride(target.id, perm);
    const fresh = await userLogic.list();
    setUsers(fresh); setTarget(fresh.find((x) => x.id === target.id) || null);
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="lock"
        title="Permission Manager"
        subtitle="Assign permissions by role, or override them per individual user."
      />

      <div className="seg mb-18">
        <button className={`seg__btn ${mode === 'role' ? 'active' : ''}`} onClick={() => setMode('role')}><Icon name="badge" size={14} /> Role-based</button>
        <button className={`seg__btn ${mode === 'user' ? 'active' : ''}`} onClick={() => setMode('user')}><Icon name="users" size={14} /> User-specific</button>
      </div>

      {mode === 'role' ? (
        <>
          <Card>
            <div className="perm-mgr__form-row">
              <Field label="Select role" hint="Edit the permissions granted to every user with this role.">
                <Select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="perm-mgr__min-w">
                  <option value="">Select role…</option>
                  {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </Select>
              </Field>
              <div className="flex-1" />
              {selectedRole && can('permissions.edit') && !selectedRole.all && (
                <Button variant="primary" icon="save" disabled={!dirty} loading={saving} onClick={saveRole}>Save changes</Button>
              )}
            </div>
          </Card>

          {selectedRole && (
            <Card title={`${selectedRole.name} — permissions`} bodyClass="card__body--flush" className="mt-16">
              {selectedRole.all
                ? <div className="card__body"><div className="alert alert--success"><Icon name="shield" size={15} />Super Admin holds all permissions; nothing to edit.</div></div>
                : <PermissionMatrix value={rolePerms} onToggle={toggleRolePerm} readOnly={!can('permissions.edit')} />}
            </Card>
          )}
        </>
      ) : (
        <>
          <Card>
            <Field label="Select user" hint="Permissions inherited from the user’s role, plus any custom overrides.">
              <Select value={userId} onChange={(e) => setUserId(e.target.value)} className="perm-mgr__user-min-w">
                <option value="">Select user…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.roleName}</option>)}
              </Select>
            </Field>
            {target && (
              <div className="legend-row">
                <div className="legend"><span className="legend__dot legend__dot--inherited" /> Inherited from role</div>
                <div className="legend"><span className="legend__dot legend__dot--custom" /> Custom grant</div>
                <div className="legend"><span className="legend__dot legend__dot--denied" /> Explicitly denied</div>
              </div>
            )}
          </Card>

          {target && userResolved && (
            <>
              {(target.grants?.length || target.denies?.length) ? (
                <Card title="Active overrides" className="mt-16">
                  <div className="chips">
                    {(target.grants || []).map((p) => (
                      <span key={`g${p}`} className="chip chip--custom">+ {p} <button onClick={() => clearOverride(p)}>×</button></span>
                    ))}
                    {(target.denies || []).map((p) => (
                      <span key={`d${p}`} className="chip chip--denied">− {p} <button onClick={() => clearOverride(p)}>×</button></span>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card title={`${target.name} — effective permissions`} sub="Tick to grant; untick an inherited permission to deny it." bodyClass="card__body--flush" className="mt-16">
                <PermissionMatrix
                  value={userResolved.permissions}
                  sourceOf={userResolved.sourceOf}
                  onToggle={toggleUserPerm}
                  readOnly={!can('permissions.edit')}
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
