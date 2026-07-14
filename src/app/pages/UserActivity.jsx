import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { auditService } from '@/services/auditService.js';
import { useFormat } from '@/utils/format.js';

export default function UserActivity() {
  const { formatDateTime } = useFormat();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    auditService.list().then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) =>
    !search || (l.userName || '').toLowerCase().includes(search.toLowerCase()) || (l.action || '').toLowerCase().includes(search.toLowerCase()) || (l.module || '').toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => new Date(b.at || b.timestamp) - new Date(a.at || a.timestamp));

  return (
    <div className="fade-in">
      <PageHeader icon="users" title="User Activity" subtitle="Monitor user actions and platform usage." />

      <Card title="Recent Activity">
        <div className="search-row">
          <input className="search-row__input input" placeholder="Search by user, action, or module..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : sorted.length === 0 ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="users" size={24} /></div>
            <p className="muted">No activity recorded yet.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Action</th><th>Module</th><th>Timestamp</th></tr>
              </thead>
              <tbody>
                {sorted.slice(0, 100).map((l) => (
                  <tr key={l.id}>
                    <td>{l.userName || l.user || ''}</td>
                    <td><span className="badge badge--navy">{l.action}</span></td>
                    <td>{l.module}</td>
                    <td>{formatDateTime(l.at || l.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

