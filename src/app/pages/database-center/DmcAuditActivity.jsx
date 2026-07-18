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
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title">
            <Icon name="activity" size={18} /> Activity Log
          </div>
          <div className="dmc-db-search">
            <Icon name="search" size={14} />
            <input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="dmc-db-section__body">
          <div className="dmc-db-toolbar" style={{ marginBottom: 16 }}>
            <div className="dmc-db-toolbar__left" style={{ flexWrap: 'nowrap', overflowX: 'auto', gap: 4 }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  className={`dmc-tab-underline${filter === t.key ? ' active' : ''}`}
                  onClick={() => setFilter(t.key)}
                  style={{ padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', background: 'none', color: filter === t.key ? 'var(--brand)' : 'var(--text-soft)', fontWeight: filter === t.key ? 600 : 400, borderBottom: filter === t.key ? '2px solid var(--brand)' : '2px solid transparent' }}
                >{t.label}</button>
              ))}
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
          <div style={{ textAlign: 'right', marginTop: 12, fontSize: 13, color: 'var(--text-soft)' }}>
            Showing {Math.min(filtered.length, 100)} of {filtered.length} event(s)
          </div>
        </div>
      </div>
    </>
  );
}
