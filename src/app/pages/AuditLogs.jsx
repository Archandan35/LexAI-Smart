import React, { useEffect, useState } from 'react';
import { auditService } from '@/services/auditService.js';
import { usePermissions } from '@/hooks/usePermissions.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import DataTable from '@/components/DataTable.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { exportCsv } from '@/utils/exportData.js';
import { formatDate } from '@/utils/format.js';

function timeOnly(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const TONE = (action) => {
  if (/delete|reject|autodelete/.test(action)) return 'red';
  if (/create|login|restore|protect/.test(action)) return 'green';
  if (/update|settings|import|export/.test(action)) return 'navy';
  return 'grey';
};

export default function AuditLogs() {
  const { can } = usePermissions();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditService.list().then((rows) => {
      setLogs([...rows].sort((a, b) => new Date(b.at) - new Date(a.at)));
      setLoading(false);
    });
  }, []);

  const columns = [
    { key: 'action', label: 'Action', sortable: true, width: 160, render: (l) => <Badge tone={TONE(l.action)}>{l.action}</Badge> },
    { key: 'userName', label: 'User', sortable: true, render: (l) => l.userName || 'system' },
    { key: 'module', label: 'Module', width: 110, render: (l) => l.module || '—' },
    { key: 'at', label: 'Date', sortable: true, width: 110, render: (l) => formatDate(l.at) },
    { key: 'time', label: 'Time', width: 100, render: (l) => timeOnly(l.at) },
    { key: 'ip', label: 'Source', width: 80, render: (l) => <span className="muted">{l.ip || 'client'}</span> },
    { key: 'details', label: 'Details', render: (l) => <span className="audit-logs__detail-text">{l.details}</span> },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        icon="history"
        title="Audit Logs"
        subtitle="Security-relevant events across the application."
        actions={(
          <PermissionGate perm="audit.export">
            <Button variant="ghost" icon="download" onClick={() => exportCsv('audit_logs', logs, ['action', 'userName', 'module', 'at', 'details'])}>Export</Button>
          </PermissionGate>
        )}
      />
      <div className="alert alert--info alert--mb">
        Client-side log — the “Source” column shows <code>client</code> because there is no server to capture a real IP address.
      </div>
      <Card bodyClass="card__body--flush">
        {loading ? <div className="loading-block"><span className="spinner" /> Loading…</div> : (
          <DataTable columns={columns} rows={logs} rowKey={(l) => l.id} searchKeys={['action', 'userName', 'module', 'details']} searchPlaceholder="Search audit log…" emptyIcon="history" emptyTitle="No audit events yet." />
        )}
      </Card>
    </div>
  );
}
