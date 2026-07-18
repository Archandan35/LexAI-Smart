import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackups } from '@/hooks/useBackups.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { bytes, useFormat } from '@/utils/format.js';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';

const STAT_ICONS = {
  Provider: 'server',
  Collections: 'layers',
  Backups: 'refresh',
  'Backup Size': 'archive',
  Retention: 'clock',
  Storage: 'hard-drive',
};

const STAT_VARIANTS = ['indigo', 'green', 'amber', 'blue', 'purple', 'cyan'];

export default function DmcDashboard() {
  const { formatDate, formatDateTime } = useFormat();
  const { backups, stats } = useBackups();
  const navigate = useNavigate();
  const [health, setHealth] = useState({ status: 'checking', provider: '—', version: '—', collections: 0 });

  useEffect(() => {
    databaseAdminService.connectionStatus()
      .then((s) => {
        setHealth({
          status: s.connected ? 'connected' : 'disconnected',
          provider: databaseAdminService.providerName(),
          version: String(databaseAdminService.schemaVersion()),
          collections: databaseAdminService.knownCollections().length,
        });
      })
      .catch(() => setHealth({ status: 'error', provider: '—', version: '—', collections: 0 }));
  }, []);

  const statCards = [
    { label: 'Provider', value: health.provider, sub: health.status === 'connected' ? 'Connected' : 'Disconnected', variant: 'indigo' },
    { label: 'Collections', value: health.collections, sub: 'Schema v' + health.version, variant: 'green' },
    { label: 'Backups', value: backups.length, sub: stats?.lastBackup ? 'Last: ' + formatDate(stats.lastBackup) : 'No backups yet', variant: 'amber' },
    { label: 'Backup Size', value: bytes(stats?.totalBytes || 0), sub: (stats?.protectedCount ?? 0) + ' protected', variant: 'blue' },
    { label: 'Retention', value: stats?.retention || '—', sub: stats?.frequency || 'manual', variant: 'purple' },
    { label: 'Storage', value: bytes(0), sub: 'File storage', variant: 'cyan' },
  ];

  return (
    <>
      <div className="dmc-db-hero">
        <div className="dmc-db-hero__icon">
          <Icon name="database" size={36} />
        </div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Database Dashboard</h2>
          <p>Real-time health, status, and activity overview of your database system.</p>
          <div className="dmc-db-hero__actions">
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/database-center/backup-recovery')}>
              <Icon name="refresh" size={14} /> Manage Backups
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/database-center/data-explorer')}>
              <Icon name="layers" size={14} /> Data Explorer
            </Button>
          </div>
        </div>
        <div className="dmc-db-hero__watermark">
          <Icon name="database" size={96} />
        </div>
      </div>

      <div className="dmc-db-stats-row">
        {statCards.map((c, i) => (
          <div key={c.label} className="dmc-db-statcard">
            <div className={`dmc-db-statcard__icon dmc-db-statcard__icon--${STAT_VARIANTS[i]}`}>
              <Icon name={STAT_ICONS[c.label]} size={18} />
            </div>
            <div className="dmc-db-statcard__body">
              <div className="dmc-db-statcard__label">{c.label}</div>
              <div className="dmc-db-statcard__value">{c.value}</div>
              <div className="dmc-db-statcard__sub">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title">
            <Icon name="activity" size={18} /> System Health
          </div>
          <span className="dmc-db-section__badge">Live</span>
        </div>
        <div className="dmc-db-table-wrap">
          <table className="dmc-db-table">
            <thead>
              <tr><th>Metric</th><th>Status</th><th>Details</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><div className="dmc-db-table__metric"><Icon name="server" size={14} /> Database Connection</div></td>
                <td><span className={`dmc-badge dmc-badge--${health.status === 'connected' ? 'green' : 'red'}`}>{health.status}</span></td>
                <td className="dmc-db-table__detail">{health.provider} · Schema v{health.version}</td>
              </tr>
              <tr>
                <td><div className="dmc-db-table__metric"><Icon name="layers" size={14} /> Schema Integrity</div></td>
                <td><span className="dmc-badge dmc-badge--green">Valid</span></td>
                <td className="dmc-db-table__detail">{health.collections} collections deployed</td>
              </tr>
              <tr>
                <td><div className="dmc-db-table__metric"><Icon name="refresh" size={14} /> Backup Status</div></td>
                <td><span className={`dmc-badge dmc-badge--${backups.length ? 'green' : 'amber'}`}>{backups.length ? 'Active' : 'None'}</span></td>
                <td className="dmc-db-table__detail">{backups.length} backup(s), {stats?.protectedCount} protected</td>
              </tr>
              <tr>
                <td><div className="dmc-db-table__metric"><Icon name="hard-drive" size={14} /> File Storage</div></td>
                <td><span className="dmc-badge dmc-badge--green">Operational</span></td>
                <td className="dmc-db-table__detail">Provider-agnostic</td>
              </tr>
              <tr>
                <td><div className="dmc-db-table__metric"><Icon name="clock" size={14} /> Last Backup</div></td>
                <td><span className={`dmc-badge dmc-badge--${stats?.lastBackup ? 'green' : 'amber'}`}>{stats?.lastBackup ? 'Completed' : 'Never'}</span></td>
                <td className="dmc-db-table__detail">{stats?.lastBackup ? formatDateTime(stats.lastBackup) : 'No backup recorded'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
