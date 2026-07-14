import { useState, useEffect } from 'react';
import { auditService } from '@/services/auditService.js';
import { useFormat } from '@/utils/format.js';
import PageHeader from '@/components/PageHeader.jsx';
import Icon from '@/components/Icon.jsx';

export default function DmcAuditActivity() {
  const { formatDate } = useFormat();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    auditService.list().then((all) => setLogs(Array.isArray(all) ? all : [])).catch(() => {});
  }, []);

  const filtered = logs.filter((l) => {
    if (filter !== 'all' && l.action !== filter && !l.action?.startsWith(filter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.action || '').toLowerCase().includes(q) || (l.user || l.userName || '').toLowerCase().includes(q) || (l.module || '').toLowerCase().includes(q);
    }
    return true;
  });

  const tabs = [
    { key: 'all', label: 'All Events' },
    { key: 'backup', label: 'Backup' },
    { key: 'restore', label: 'Restore' },
    { key: 'import', label: 'Import' },
    { key: 'export', label: 'Export' },
    { key: 'delete', label: 'Delete' },
    { key: 'user', label: 'User' },
    { key: 'system', label: 'System' },
  ];

  return (
    <>
      <PageHeader icon="activity" title="Audit & Activity" subtitle="Track every database, backup, import, export, and delete operation." />

      <div className="dmc-toolbar">
        <div className="dmc-toolbar__left">
          {tabs.map((t) => (
            <button key={t.key} className={`dmc-tab dmc-tab-btn${filter === t.key ? ' dmc-tab--active' : ''}`} onClick={() => setFilter(t.key)}>{t.label}</button>
          ))}
        </div>
        <div className="dmc-toolbar__right">
          <input className="dmc-search" placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <table className="dmc-table">
        <thead>
          <tr><th>Action</th><th>User</th><th>Module</th><th>Date</th><th>Details</th></tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={5} className="dmc-empty-cell">No audit events found.</td></tr>
          ) : (
            filtered.slice(0, 100).map((l, i) => {
              const actionColor = l.action?.startsWith('backup') ? 'green' : l.action?.startsWith('restore') ? 'navy' : l.action?.startsWith('delete') ? 'red' : l.action?.startsWith('import') ? 'amber' : 'navy';
              return (
                <tr key={l.id || i}>
                  <td><span className={`dmc-badge dmc-badge--${actionColor}`}>{l.action || '—'}</span></td>
                  <td>{l.user || l.userName || 'system'}</td>
                  <td>{l.module || '—'}</td>
                  <td>{formatDate(l.createdAt || l.created_at || l.timestamp)}</td>
                  <td className="dmc-cell-truncate">{l.details || l.description || '—'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="dmc-table-footer">
        Showing {Math.min(filtered.length, 100)} of {filtered.length} event(s)
      </div>
    </>
  );
}
