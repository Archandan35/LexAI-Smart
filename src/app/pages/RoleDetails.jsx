import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roleLogic } from '@/logic/roleLogic.js';
import { permissionService } from '@/services/permissionService.js';
import { userLogic } from '@/logic/userLogic.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import Modal from '@/components/Modal.jsx';
import Spinner from '@/components/Spinner.jsx';
import Toggle from '@/components/Toggle.jsx';
import RoleForm from '@/components/RoleForm.jsx';
import PermissionMatrix from '@/components/PermissionMatrix.jsx';
import { Field, Select } from '@/components/Field.jsx';
import { ROLE_HIERARCHY } from '@/constants/permissions.js';
import { exportJson } from '@/utils/exportData.js';
import { formatDateTime } from '@/utils/format.js';

export default function RoleDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, loadRoles, roles: allRoles } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();

  const [role, setRole] = useState(null);
  const [perms, setPerms] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cloneFrom, setCloneFrom] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [users, setUsers] = useState([]);

  const load = async () => {
    setLoading(true);
    const r = await roleLogic.get(id);
    setRole(r);
    setPerms(new Set(r?.permissions || []));
    setDirty(false);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const readOnly = !can('roles.edit') || role?.all;

  const toggle = (perm, next) => {
    setPerms((prev) => {
      const s = new Set(prev);
      if (next) s.add(perm); else s.delete(perm);
      return s;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const res = await permissionService.setRolePermissions(role.id, [...perms]);
    setSaving(false);
    if (res) { toast.push('Permissions saved.', 'success'); setDirty(false); await loadRoles(); }
    else toast.push('Save failed.', 'error');
  };

  const saveMeta = async (data) => {
    const res = await roleLogic.update(role.id, { name: data.name, description: data.description, status: data.status }, user);
    if (res.ok) { toast.push('Role updated.', 'success'); setEditing(false); await load(); await loadRoles(); }
    else toast.push(res.error, 'error');
  };

  const doClone = async () => {
    if (!cloneFrom) return;
    const res = await roleLogic.clonePermissionsFrom(role.id, cloneFrom, user);
    if (res.ok) { toast.push('Permissions cloned.', 'success'); await load(); await loadRoles(); }
    else toast.push(res.error, 'error');
  };

  const openAssign = async () => { setUsers(await userLogic.list()); setAssignOpen(true); };
  const assignUser = async (u, attach) => {
    await userLogic.update(u.id, { roleCode: attach ? role.code : '' }, user);
    setUsers(await userLogic.list());
    toast.push(attach ? `Assigned ${u.name}.` : `Unassigned ${u.name}.`, 'success');
  };

  const inheritedFrom = useMemo(() => {
    if (!role) return [];
    const idx = ROLE_HIERARCHY.indexOf(role.code);
    if (idx === -1 || role.inheritsHierarchy === false) return [];
    return ROLE_HIERARCHY.slice(idx + 1);
  }, [role]);

  if (loading) return <Spinner label="Loading role…" />;
  if (!role) return <Card><div className="empty">Role not found.</div></Card>;

  return (
    <div className="fade-in">
      <PageHeader
        icon="badge"
        title={role.name}
        subtitle={role.description || 'Role permission matrix'}
        actions={(
          <>
            <Button variant="ghost" icon="arrow" onClick={() => nav('/admin/roles')}>Back</Button>
            {can('roles.export') && <Button variant="ghost" icon="download" onClick={() => exportJson(`role_${role.code}`, { ...role, permissions: [...perms] })}>Export</Button>}
            {can('roles.edit') && <Button variant="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Button>}
            {can('roles.edit') && !readOnly && <Button variant="primary" icon="save" loading={saving} disabled={!dirty} onClick={save}>Save permissions</Button>}
          </>
        )}
      />

      <div className="grid-3 mb-20">
        <Card title="Role">
          <div className="kv"><span>Code</span><b>{role.code}</b></div>
          <div className="kv"><span>Status</span><Badge tone={(role.status || 'Active') === 'Active' ? 'green' : 'grey'}>{role.status || 'Active'}</Badge></div>
          <div className="kv"><span>Type</span><span>{role.system ? 'System' : 'Custom'}</span></div>
          <div className="kv"><span>Updated</span><span>{formatDateTime(role.updatedAt || role.createdAt)}</span></div>
        </Card>
        <Card title="Hierarchy inheritance" sub="Higher roles inherit lower ones">
          {role.all ? <div className="alert alert--success"><Icon name="shield" size={15} />Super Admin — all permissions.</div> : (
            <>
              <Toggle
                checked={role.inheritsHierarchy !== false}
                disabled={readOnly || ROLE_HIERARCHY.indexOf(role.code) === -1}
                label="Inherit lower-role permissions"
                onChange={async (v) => { await roleLogic.update(role.id, { inheritsHierarchy: v }, user); await load(); await loadRoles(); }}
              />
              <div className="role-details__hint">
                {inheritedFrom.length ? <>Inherits from: {inheritedFrom.map((c) => <Badge key={c} tone="grey">{allRoles.find((r) => r.code === c)?.name || c}</Badge>)}</> : 'No lower roles in chain.'}
              </div>
            </>
          )}
        </Card>
        <Card title="Tools">
          {can('roles.edit') && !readOnly && (
            <Field label="Clone permissions from">
              <div className="flex-row gap-8">
                <Select value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
                  <option value="">Select role…</option>
                  {allRoles.filter((r) => r.id !== role.id).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </Select>
                <Button variant="ghost" icon="layers" onClick={doClone}>Clone</Button>
              </div>
            </Field>
          )}
          {can('users.assign') && <Button variant="ghost" icon="users" className="btn--block" onClick={openAssign}>Assign users</Button>}
        </Card>
      </div>

      <Card title="Permission Matrix" sub={readOnly ? 'Read-only' : 'Tick the actions this role may perform in each module'} bodyClass="card__body--flush">
        <PermissionMatrix value={perms} onToggle={toggle} readOnly={readOnly} />
      </Card>

      <Modal open={editing} title="Edit Role" onClose={() => setEditing(false)}>
        <RoleForm initial={role} onSubmit={saveMeta} onCancel={() => setEditing(false)} />
      </Modal>

      <Modal open={assignOpen} title={`Assign users to ${role.name}`} onClose={() => setAssignOpen(false)} size="lg">
        <div className="assign-list">
          {users.map((u) => {
            const attached = u.roleCode === role.code;
            return (
              <div key={u.id} className="assign-row">
                <div>
                  <div className="fw-600">{u.name}</div>
                  <div className="role-details__sub">{u.email || u.username} · {u.roleName}</div>
                </div>
                <Toggle checked={attached} onChange={(v) => assignUser(u, v)} />
              </div>
            );
          })}
          {!users.length && <div className="empty">No users yet.</div>}
        </div>
      </Modal>
    </div>
  );
}
