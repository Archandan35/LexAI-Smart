import React from 'react';
import Badge from './Badge.jsx';
import Icon from './Icon.jsx';
import DataTable from './DataTable.jsx';
import PermissionGate from './PermissionGate.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import { bytes, formatDate } from '@/utils/format.js';

function timeOnly(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// BackupHistoryTable — single-row listing with inline actions. Shared by the
// dashboard (limited) and the full history page.
export default function BackupHistoryTable({ backups, actor, can, onChanged, onRestore, toast, limit }) {
  const rows = limit ? backups.slice(0, limit) : backups;

  const act = async (promise, okMsg) => {
    const res = await promise;
    if (res?.ok === false) { toast?.push(res.error, 'error'); return; }
    if (okMsg) toast?.push(okMsg, 'success');
    onChanged?.();
  };

  const columns = [
    { key: 'name', label: 'Backup Name', sortable: true, render: (b) => (
      <div>
        <div style={{ fontWeight: 620, fontFamily: 'monospace', fontSize: 12.5 }}>{b.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{b.type} · schema {b.schemaVersion}</div>
      </div>
    ) },
    { key: 'createdAt', label: 'Date', sortable: true, width: 110, render: (b) => formatDate(b.createdAt) },
    { key: 'time', label: 'Time', width: 100, render: (b) => timeOnly(b.createdAt) },
    { key: 'size', label: 'Size', sortable: true, width: 90, render: (b) => bytes(b.size) },
    { key: 'status', label: 'Status', width: 100, render: (b) => <Badge tone={b.status === 'Completed' ? 'green' : 'amber'}>{b.status}</Badge> },
    { key: 'protected', label: 'Protected', width: 90, render: (b) => (b.protected ? <Badge tone="navy" dot>Yes</Badge> : <span style={{ color: 'var(--text-faint)' }}>No</span>) },
    { key: 'actions', label: 'Actions', width: 200, render: (b) => (
      <div className="row-actions">
        <PermissionGate perm="backup.restore">
          <button className="iconbtn" title="Restore" onClick={() => onRestore?.(b)}><Icon name="history" size={15} /></button>
        </PermissionGate>
        <PermissionGate perm="backup.export">
          <button className="iconbtn" title="Export / Download" onClick={() => backupLogic.export(b.id)}><Icon name="download" size={15} /></button>
        </PermissionGate>
        <PermissionGate perm="backup.protect">
          <button className="iconbtn" title={b.protected ? 'Unprotect' : 'Protect'} onClick={() => act(backupLogic.setProtected(b.id, !b.protected, actor), b.protected ? 'Unprotected.' : 'Protected.')}>
            <Icon name={b.protected ? 'eye' : 'shield'} size={15} />
          </button>
        </PermissionGate>
        <PermissionGate perm="backup.delete">
          <button className="iconbtn iconbtn--danger" title={b.protected ? 'Unprotect first' : 'Delete'} disabled={b.protected} onClick={() => { if (confirm(`Delete ${b.name}?`)) act(backupLogic.remove(b.id, actor), 'Deleted.'); }}>
            <Icon name="trash" size={15} />
          </button>
        </PermissionGate>
      </div>
    ) },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(b) => b.id}
      searchable={!limit}
      searchKeys={['name', 'type', 'status']}
      searchPlaceholder="Search backups…"
      pageSize={limit || 10}
      emptyIcon="database"
      emptyTitle="No backups yet. Create your first backup."
    />
  );
}
