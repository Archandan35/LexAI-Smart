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

  const actionColor = (action) => {
    if (!action) return 'navy';
    if (action.startsWith('backup')) return 'green';
    if (action.startsWith('restore')) return 'navy';
    if (action.startsWith('delete')) return 'red';
    if (action.startsWith('import')) return 'amber';
    return 'navy';
  };

  const getCount = (key) => {
    if (key === 'all') return logs.length;
    return logs.filter(l => l.action?.startsWith(key)).length;
  };

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
        <div className="dmc-db-hero__icon"><Icon name="activity" size={26} /></div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Audit & Activity</h2>
          <p>Track every database, backup, import, export, and delete operation.</p>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title"><Icon name="activity" size={18} /> Activity Log</div>
          <div className="dmc-db-search">
            <Icon name="search" size={14} />
            <input placeholder="Search events\u2026" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="dmc-db-section__body p-0">
          <div className="flex-row gap-0 border-b overflow-x-auto px-20">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`dmc-audit-tab${filter === t.key ? ' dmc-audit-tab--active' : ''}`}
                onClick={() => setFilter(t.key)}
              >{t.label} <span className="text-faint ml-2">{getCount(t.key)}</span></button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="dmc-empty">
              <div className="dmc-empty__icon"><Icon name="activity" size={32} /></div>
              <div className="dmc-empty__title">No events found</div>
              <div className="dmc-empty__hint">Try a different filter or search term.</div>
            </div>
          ) : (
            <>
              <div className="dmc-db-table-wrap">
                <table className="dmc-db-table">
                  <thead>
                    <tr><th>Action</th><th>User</th><th>Module</th><th>Date</th><th>Details</th></tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map((l, i) => (
                      <tr key={l.id || i}>
                        <td><span className={`dmc-badge dmc-badge--${actionColor(l.action)}`}>{l.action || '\u2014'}</span></td>
                        <td>{l.user || l.userName || 'system'}</td>
                        <td>{l.module || '\u2014'}</td>
                        <td>{formatDate(l.createdAt || l.created_at || l.timestamp)}</td>
                        <td className="maxw-300 overflow-hidden text-ellipsis text-soft">{l.details || l.description || '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right py-10 px-20 fs-13 text-soft border-t">
                Showing {Math.min(filtered.length, 100)} of {filtered.length} event(s)
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
