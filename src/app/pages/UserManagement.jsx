import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '@/hooks/useUsers.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import { userLogic, isProtectedUser } from '@/logic/userLogic.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import Modal from '@/components/Modal.jsx';
import DataTable from '@/components/DataTable.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import RoleSelector from '@/components/RoleSelector.jsx';
import { Field, Input } from '@/components/Field.jsx';
import { exportCsv } from '@/utils/exportData.js';
import { useFormat } from '@/utils/format.js';

const BLANK = { name: '', email: '', username: '', roleCode: '', password: '', status: 'Active' };

export default function UserManagement() {
  const { formatDate, fromNow } = useFormat();
  const { users, loading, refresh } = useUsers();
  const { user: actor, roles } = useAuth();
  const { can } = usePermissions();
  const { settings } = useSettings();
  const toast = useToast();
  const nav = useNavigate();

  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null); // { mode: 'single'|'bulk', users: [] }
  const [superWarn, setSuperWarn] = useState(false);

  // Protected (Super Admin) accounts — used for selection guards and warnings.
  const protectedIds = useMemo(() => users.filter(isProtectedUser).map((u) => u.id), [users]);
  const selectionHasProtected = selected.some((id) => protectedIds.includes(id));

  const openCreate = () => setForm({ ...BLANK, roleCode: settings.defaultRole || '' });
  const submit = async () => {
    setBusy(true);
    const res = await userLogic.create(form, actor);
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    toast.push('User created.', 'success');
    setForm(null); refresh();
  };

  const setStatus = async (u, status) => {
    const res = await userLogic.setStatus(u.id, status, actor);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    toast.push('Status updated.', 'success'); refresh();
  };
  const changeRole = async (u, roleCode) => {
    const res = await userLogic.setRole(u.id, roleCode, actor);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    toast.push(`${u.name} → ${roleCode}.`, 'success'); refresh();
  };

  // Selection change — auto-warn if a protected account gets selected (incl. Select All).
  const onSelectedChange = (next) => {
    setSelected(next);
    if (next.some((id) => protectedIds.includes(id))) setSuperWarn(true);
  };
  const uncheckProtected = () => {
    setSelected((s) => s.filter((id) => !protectedIds.includes(id)));
    setSuperWarn(false);
  };

  // Single delete — opens a confirmation modal (protected/self are blocked).
  const askRemove = (u) => {
    if (isProtectedUser(u)) { setSuperWarn(true); return; }
    if (u.id === actor?.id) { toast.push('You cannot delete your own account.', 'error'); return; }
    setConfirm({ mode: 'single', users: [u] });
  };

  // Bulk delete — force the user to uncheck the Super Admin first.
  const askBulk = () => {
    if (selectionHasProtected) { setSuperWarn(true); return; }
    const deletable = users.filter((u) => selected.includes(u.id) && u.id !== actor?.id);
    if (!deletable.length) { toast.push('No deletable users selected.', 'info'); return; }
    setConfirm({ mode: 'bulk', users: deletable });
  };

  const doDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    if (confirm.mode === 'single') {
      const res = await userLogic.remove(confirm.users[0].id, actor);
      setBusy(false); setConfirm(null);
      if (!res.ok) { toast.push(res.error, 'error'); return; }
      toast.push('User deleted.', 'success');
      setSelected((s) => s.filter((id) => id !== confirm.users[0].id));
      refresh();
      return;
    }
    const res = await userLogic.bulkRemove(confirm.users.map((u) => u.id), actor);
    setBusy(false); setConfirm(null);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    const { deleted, skippedProtected = 0, skippedSelf = 0, failed = 0 } = res.data;
    if (deleted === 0) {
      toast.push('No users were deleted.', 'error');
    } else {
      const extra = [];
      if (skippedProtected) extra.push(`${skippedProtected} protected`);
      if (skippedSelf) extra.push('your account');
      if (failed) extra.push(`${failed} failed`);
      toast.push(`Deleted ${deleted} user(s)${extra.length ? ` — skipped ${extra.join(', ')}` : ''}.`, 'success');
    }
    setSelected([]); refresh();
  };

  const columns = [
    { key: 'name', label: 'User', sortable: true, render: (u) => (
      <div className="user-cell">
        <span className="avatar-sm">{(u.name || '?').slice(0, 2).toUpperCase()}</span>
        <div>
          <div className="user-cell__name">{u.name}{isProtectedUser(u) && <Badge tone="amber">Super Admin</Badge>}</div>
          <div className="user-cell__sub">{u.email || u.username}</div>
        </div>
      </div>
    ) },
    { key: 'roleName', label: 'Role', sortable: true, render: (u) => (
      can('users.assign') && !isProtectedUser(u)
        ? <RoleSelector roles={roles} value={u.roleCode} onChange={(v) => changeRole(u, v)} />
        : <Badge tone="navy">{u.roleName}</Badge>
    ) },
    { key: 'permissionCount', label: 'Perms', sortable: true, width: 80, render: (u) => <Badge tone="grey">{u.permissionCount}</Badge> },
    { key: 'lastLoginAt', label: 'Last login', sortable: true, width: 120, render: (u) => (u.lastLoginAt ? fromNow(u.lastLoginAt) : '—') },
    { key: 'createdAt', label: 'Created', sortable: true, width: 110, render: (u) => formatDate(u.createdAt) },
    { key: 'status', label: 'Status', width: 90, render: (u) => <Badge tone={u.status === 'Active' ? 'green' : 'grey'} dot>{u.status}</Badge> },
    { key: 'actions', label: '', width: 200, render: (u) => (
      <div className="row-actions">
        <button className="iconbtn" title="View" onClick={() => nav(`/admin/users/${u.id}`)}><Icon name="eye" size={15} /></button>
        <PermissionGate perm="users.edit">
          <button className="iconbtn" title="Edit" onClick={() => nav(`/admin/users/${u.id}`)}><Icon name="edit" size={15} /></button>
        </PermissionGate>
        <PermissionGate perm="users.create">
          <button className="iconbtn" title="Duplicate" onClick={() => { setForm({ ...BLANK, name: u.name, email: u.email, username: u.username, roleCode: u.roleCode, status: 'Active' }); }}><Icon name="copy" size={15} /></button>
        </PermissionGate>
        <PermissionGate perm="users.edit">
          <button className="iconbtn" title={u.status === 'Active' ? 'Disable' : 'Enable'} onClick={() => setStatus(u, u.status === 'Active' ? 'Disabled' : 'Active')}>
            <Icon name={u.status === 'Active' ? 'ban' : 'check'} size={15} />
          </button>
        </PermissionGate>
        <PermissionGate perm="users.delete">
          {isProtectedUser(u) ? (
            <button className="iconbtn" title="Super Admin is protected and cannot be deleted" onClick={() => setSuperWarn(true)} disabled><Icon name="lock" size={15} /></button>
          ) : (
            <button className="iconbtn iconbtn--danger" title="Delete" onClick={() => askRemove(u)}><Icon name="trash" size={15} /></button>
          )}
        </PermissionGate>
      </div>
    ) },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        icon="users"
        title="User Management"
        subtitle="Create users, assign roles, and manage account status. New users are created here (no public sign-up)."
        actions={(
          <>
            <PermissionGate perm="users.export"><Button variant="ghost" icon="download" onClick={() => exportCsv('users', users, ['name', 'email', 'username', 'roleName', 'status'])}>Export</Button></PermissionGate>
            <PermissionGate perm="users.create"><Button variant="primary" icon="plus" onClick={openCreate}>Add User</Button></PermissionGate>
          </>
        )}
      />

      {selected.length > 0 && (
        <div className="bulk-bar">
          <span><b>{selected.length}</b> selected</span>
          {selectionHasProtected && <Badge tone="amber">Super Admin included — will be skipped</Badge>}
          <div className="bulk-bar__spacer" />
          <PermissionGate perm="users.bulkDelete"><Button variant="danger" size="sm" icon="trash" onClick={askBulk}>Delete selected</Button></PermissionGate>
        </div>
      )}

      <Card bodyClass="card__body--flush">
        {loading ? <div className="loading-block"><span className="spinner" /> Loading users…</div> : (
          <DataTable
            columns={columns}
            rows={users}
            selectable={can('users.bulkDelete')}
            selected={selected}
            onSelectedChange={onSelectedChange}
            searchKeys={['name', 'email', 'username', 'roleName']}
            searchPlaceholder="Search users…"
            emptyIcon="users"
            emptyTitle="No users yet."
          />
        )}
      </Card>

      {/* Add User */}
      <Modal
        open={!!form}
        title="Add User"
        onClose={() => setForm(null)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button variant="primary" icon="save" loading={busy} onClick={submit}>Create user</Button>
          </>
        )}
      >
        {form && (
          <div>
            <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Adv. Priya Sharma" autoFocus /></Field>
            <div className="input-row">
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@lexai.local" /></Field>
              <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="priya" /></Field>
            </div>
            <div className="input-row">
              <Field label="Role"><RoleSelector roles={roles} value={form.roleCode} onChange={(v) => setForm({ ...form, roleCode: v })} /></Field>
              <Field label="Password" hint="Required; minimum 8 characters"><PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter password" /></Field>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirm}
        title={confirm?.mode === 'bulk' ? 'Delete selected users' : 'Delete user'}
        className="modal--confirm"
        onClose={() => setConfirm(null)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" icon="trash" loading={busy} onClick={doDelete}>
              {confirm?.mode === 'bulk' ? `Delete ${confirm?.users.length} user(s)` : 'Delete'}
            </Button>
          </>
        )}
      >
        {confirm && (
          <div className="confirm-dialog">
            <span className="confirm-dialog__icon confirm-dialog__icon--danger"><Icon name="trash" size={20} /></span>
            <div>
              <div className="confirm-dialog__title">This action cannot be undone</div>
              <div className="confirm-dialog__text">
                {confirm.mode === 'bulk'
                  ? `You are about to permanently delete ${confirm.users.length} user account(s):`
                  : `You are about to permanently delete the account for ${confirm.users[0].name}.`}
              </div>
              {confirm.mode === 'bulk' && (
                <ul className="confirm-dialog__list">
                  {confirm.users.map((u) => <li key={u.id}>{u.name} <span className="muted">({u.email || u.username})</span></li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Super Admin protection warning */}
      <Modal
        open={superWarn}
        title="Super Admin is protected"
        className="modal--warn"
        onClose={() => setSuperWarn(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setSuperWarn(false)}>Close</Button>
            {selectionHasProtected && <Button variant="primary" icon="check" onClick={uncheckProtected}>Uncheck Super Admin</Button>}
          </>
        )}
      >
        <div className="confirm-dialog">
          <span className="confirm-dialog__icon confirm-dialog__icon--warn"><Icon name="shield" size={20} /></span>
          <div>
            <div className="confirm-dialog__title">The Super Admin account cannot be deleted</div>
            <div className="confirm-dialog__text">
              The Super Admin is a protected system account and can never be deleted. If it is part of
              your current selection, please <b>uncheck the Super Admin</b> before continuing. Proceeding
              with a bulk delete while it is selected will not remove it — it is automatically skipped —
              but it's safer to uncheck it now.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

