import { useState, useEffect } from 'react';
import { auditService } from '@/services/auditService.js';
import { useFormat } from '@/utils/format.js';
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
      <div className="dmc-db-hero dmc-db-hero--sm">
        <div className="dmc-db-hero__icon">
          <Icon name="activity" size={26} />
        </div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Audit & Activity</h2>
          <p>Track every database, backup, import, export, and delete operation.</p>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          <div className="dmc-db-toolbar" style={{ width: '100%', marginBottom: 0 }}>
            <div className="dmc-db-toolbar__left" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  className={`dmc-tab-btn${filter === t.key ? ' dmc-tab--active' : ''}`}
                  style={{ borderBottom: filter === t.key ? '2px solid var(--brand)' : '2px solid transparent', color: filter === t.key ? 'var(--brand)' : 'var(--text-soft)', fontWeight: filter === t.key ? 600 : 500, whiteSpace: 'nowrap' }}
                  onClick={() => setFilter(t.key)}
                >{t.label}</button>
              ))}
            </div>
            <div className="dmc-db-toolbar__right">
              <div className="dmc-db-search">
                <Icon name="search" size={14} />
                <input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="dmc-db-table-wrap">
          <table className="dmc-db-table">
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
        </div>
        <div className="dmc-db-section__head" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--border)', borderBottom: 'none', padding: '10px 20px' }}>
          <span className="dmc-db-section__badge">Showing {Math.min(filtered.length, 100)} of {filtered.length} event(s)</span>
        </div>
      </div>
    </>
  );
}
