import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles.js';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { roleLogic } from '@/logic/roleLogic.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Icon from '@/components/Icon.jsx';
import Modal from '@/components/Modal.jsx';
import DataTable from '@/components/DataTable.jsx';
import RoleForm from '@/components/RoleForm.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { exportJson } from '@/utils/exportData.js';
import { formatDate } from '@/utils/format.js';

export default function RoleManagement() {
  const { roles, loading, refresh } = useRoles();
  const { can } = usePermissions();
  const { user, loadRoles } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const afterChange = async () => { await refresh(); await loadRoles(); };

  const create = async (data, andContinue) => {
    setBusy(true);
    const res = await roleLogic.create(data, user);
    setBusy(false);
    if (!res.ok) { toast.push(res.error, 'error'); return; }
    toast.push('Role created.', 'success');
    setCreating(false);
    await afterChange();
    if (andContinue) nav(`/admin/roles/${res.data.id}`);
  };

  const act = async (fn, okMsg) => {
    const res = await fn();
    if (res?.ok === false) { toast.push(res.error, 'error'); return; }
    toast.push(okMsg, 'success');
    await afterChange();
  };

  const filtered = roles.filter((r) => statusFilter === 'all' || (r.status || 'Active') === statusFilter);

  const columns = [
    { key: 'name', label: 'Role Name', sortable: true, render: (r) => (
      <div>
        <div style={{ fontWeight: 650, color: 'var(--navy-900)' }}>{r.name}{r.system && <Badge tone="grey">system</Badge>}</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{r.code}</div>
      </div>
    ) },
    { key: 'description', label: 'Description', render: (r) => <span style={{ color: 'var(--text-soft)' }}>{r.description || '—'}</span> },
    { key: 'userCount', label: 'Users', sortable: true, width: 80, render: (r) => <Badge tone="navy">{r.userCount}</Badge> },
    { key: 'permissionCount', label: 'Permissions', sortable: true, width: 110, render: (r) => (r.all || r.permissionCount === Infinity ? <Badge tone="green">All</Badge> : r.permissionCount) },
    { key: 'createdAt', label: 'Created', sortable: true, width: 110, render: (r) => formatDate(r.createdAt) },
    { key: 'status', label: 'Status', width: 90, render: (r) => <Badge tone={(r.status || 'Active') === 'Active' ? 'green' : 'grey'}>{r.status || 'Active'}</Badge> },
    { key: 'actions', label: '', width: 180, render: (r) => (
      <div className="row-actions">
        <button className="iconbtn" title="View / edit permissions" onClick={() => nav(`/admin/roles/${r.id}`)}><Icon name="eye" size={15} /></button>
        <PermissionGate perm="roles.create">
          <button className="iconbtn" title="Duplicate" onClick={() => act(() => roleLogic.duplicate(r.id, user), 'Role duplicated.')}><Icon name="layers" size={15} /></button>
        </PermissionGate>
        <PermissionGate perm="roles.export">
          <button className="iconbtn" title="Export" onClick={() => exportJson(`role_${r.code}`, r)}><Icon name="download" size={15} /></button>
        </PermissionGate>
        <PermissionGate perm="roles.edit">
          <button className="iconbtn" title={(r.status || 'Active') === 'Active' ? 'Disable' : 'Enable'} onClick={() => act(() => roleLogic.setEnabled(r.id, (r.status || 'Active') !== 'Active', user), 'Status updated.')}>
            <Icon name={(r.status || 'Active') === 'Active' ? 'close' : 'check'} size={15} />
          </button>
        </PermissionGate>
        {!r.system && (
          <PermissionGate perm="roles.delete">
            <button className="iconbtn iconbtn--danger" title="Delete" onClick={() => { if (confirm(`Delete role "${r.name}"?`)) act(() => roleLogic.remove(r.id, user), 'Role deleted.'); }}><Icon name="trash" size={15} /></button>
          </PermissionGate>
        )}
      </div>
    ) },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        icon="badge"
        title="Role Management"
        subtitle="Define roles and the permissions each role grants. Higher roles inherit lower-level permissions."
        actions={(
          <PermissionGate perm="roles.create">
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Create Role</Button>
          </PermissionGate>
        )}
      />

      <div className="toolbar-row">
        <div className="seg">
          {['all', 'Active', 'Disabled'].map((s) => (
            <button key={s} className={`seg__btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s === 'all' ? 'All' : s}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="ghost" icon="lock" onClick={() => nav('/admin/permissions')}>Permission Center</Button>
      </div>

      {selected.length > 0 && (
        <div className="bulk-bar">
          <span><b>{selected.length}</b> selected</span>
          <div className="bulk-bar__spacer" />
          <PermissionGate perm="roles.edit"><Button variant="ghost" size="sm" icon="check" onClick={() => act(() => roleLogic.bulkSetStatus(selected, 'Active', user), 'Enabled.')}>Enable</Button></PermissionGate>
          <PermissionGate perm="roles.edit"><Button variant="ghost" size="sm" icon="close" onClick={() => act(() => roleLogic.bulkSetStatus(selected, 'Disabled', user), 'Disabled.')}>Disable</Button></PermissionGate>
          <PermissionGate perm="roles.export"><Button variant="ghost" size="sm" icon="download" onClick={() => exportJson('roles_export', roles.filter((r) => selected.includes(r.id)))}>Export</Button></PermissionGate>
          <PermissionGate perm="roles.bulkDelete"><Button variant="danger" size="sm" icon="trash" onClick={() => { if (confirm(`Delete ${selected.length} role(s)? System roles are skipped.`)) { act(() => roleLogic.bulkRemove(selected, user), 'Deleted.'); setSelected([]); } }}>Delete</Button></PermissionGate>
        </div>
      )}

      <Card bodyClass="card__body--flush">
        {loading ? <div className="loading-block"><span className="spinner" /> Loading roles…</div> : (
          <DataTable
            columns={columns}
            rows={filtered}
            selectable={can('roles.bulkDelete') || can('roles.edit')}
            selected={selected}
            onSelectedChange={setSelected}
            searchKeys={['name', 'code', 'description']}
            searchPlaceholder="Search roles…"
            emptyIcon="badge"
            emptyTitle="No roles match."
          />
        )}
      </Card>

      <Modal open={creating} title="Create Role" onClose={() => setCreating(false)}>
        <RoleForm onSubmit={create} onCancel={() => setCreating(false)} busy={busy} />
      </Modal>
    </div>
  );
}
