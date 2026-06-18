import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userLogic } from '@/logic/userLogic.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { rbacLogic } from '@/logic/rbacLogic.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import Spinner from '@/components/Spinner.jsx';
import RoleSelector from '@/components/RoleSelector.jsx';
import PermissionMatrix from '@/components/PermissionMatrix.jsx';
import { Field, Input } from '@/components/Field.jsx';
import { formatDateTime } from '@/utils/format.js';

export default function UserDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: actor, roles } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();

  const [u, setU] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState({ name: '', email: '', username: '', password: '' });

  const load = async () => {
    setLoading(true);
    const row = await userLogic.get(id);
    setU(row);
    setEdit({ name: row?.name || '', email: row?.email || '', username: row?.username || '', password: '' });
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const resolved = useMemo(() => (u ? rbacLogic.resolve(u, roles) : null), [u, roles]);

  const save = async () => {
    const patch = { name: edit.name, email: edit.email, username: edit.username };
    if (edit.password) patch.password = edit.password;
    const res = await userLogic.update(id, patch, actor);
    if (res.ok) { toast.push('Saved.', 'success'); load(); } else toast.push(res.error, 'error');
  };
  const setRole = async (roleCode) => {
    await userLogic.setRole(id, roleCode, actor);
    toast.push('Role updated.', 'success'); load();
  };

  if (loading) return <Spinner label="Loading user…" />;
  if (!u) return <Card><div className="empty">User not found.</div></Card>;

  return (
    <div className="fade-in">
      <PageHeader
        icon="users"
        title={u.name}
        subtitle={u.email || u.username}
        actions={(
          <>
            <Button variant="ghost" icon="arrow" onClick={() => nav('/admin/users')}>Back</Button>
            {can('permissions.edit') && <Button variant="ghost" icon="lock" onClick={() => nav('/admin/permissions')}>Manage permissions</Button>}
          </>
        )}
      />

      <div className="grid-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title="Account">
            <Field label="Full name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} disabled={!can('users.edit')} /></Field>
            <Field label="Email"><Input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} disabled={!can('users.edit')} /></Field>
            <Field label="Username"><Input value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} disabled={!can('users.edit')} /></Field>
            {can('users.edit') && <Field label="Reset password" hint="Leave blank to keep current"><Input value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} placeholder="New password" /></Field>}
            {can('users.edit') && <Button variant="primary" icon="save" className="btn--block" onClick={save}>Save</Button>}
          </Card>

          <Card title="Role & status">
            <Field label="Primary role">
              <RoleSelector roles={roles} value={u.roleCode} onChange={setRole} {...(!can('users.assign') ? { disabled: true } : {})} />
            </Field>
            <div className="kv"><span>Status</span><Badge tone={u.status === 'Active' ? 'green' : 'grey'}>{u.status}</Badge></div>
            <div className="kv"><span>Effective perms</span><b>{resolved?.permissions.size}</b></div>
            <div className="kv"><span>Custom grants</span><b>{u.grants?.length || 0}</b></div>
            <div className="kv"><span>Denied</span><b>{u.denies?.length || 0}</b></div>
            <div className="kv"><span>Last login</span><span>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}</span></div>
          </Card>
        </div>

        <Card title="Effective permissions" sub="Role-inherited + custom overrides (read-only here — edit in Permission Manager)" bodyClass="card__body--flush">
          {resolved && (
            <PermissionMatrix value={resolved.permissions} sourceOf={resolved.sourceOf} readOnly />
          )}
        </Card>
      </div>
    </div>
  );
}
