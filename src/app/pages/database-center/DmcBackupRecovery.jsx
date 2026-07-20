import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackups } from '@/hooks/useBackups.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import BackupHistoryTable from '@/components/BackupHistoryTable.jsx';
import RestoreBackupModal from '@/components/RestoreBackupModal.jsx';
import ImportBackupModal from '@/components/ImportBackupModal.jsx';
import { bytes, useFormat } from '@/utils/format.js';

export default function DmcBackupRecovery() {
  const { formatDateTime } = useFormat();
  const { backups, stats, refresh } = useBackups();
  const { user } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();
  const nav = useNavigate();
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState('overview');

  const createNow = async () => {
    setCreating(true);
    const res = await backupLogic.create({ type: 'manual' }, user);
    setCreating(false);
    if (res.ok) {
      const removed = res.data.removed?.length ? ` \u00b7 ${res.data.removed.length} old removed` : '';
      toast.push(`Backup created (${bytes(res.data.backup.size)}, ${res.data.backup.durationMs}ms)${removed}.`, 'success');
      refresh();
    } else toast.push(res.error, 'error');
  };

  const onRestored = () => { setRestoreTarget(null); refresh(); toast.push('Database restored.', 'success'); };

  const tabs = ['overview', 'history', 'settings', 'restore'];

  return (
    <>
      <div className="dmc-db-hero dmc-db-hero--sm">
        <div className="dmc-db-hero__icon"><Icon name="refresh" size={26} /></div>
        <div className="dmc-db-hero__text">
          <div className="dmc-db-hero__accent" />
          <h2>Backup & Recovery</h2>
          <p>Create, restore, schedule, and manage database backups.</p>
          <div className="dmc-db-hero__actions">
            <PermissionGate perm="backup.create">
              <Button variant="primary" size="sm" icon="plus" onClick={createNow} disabled={creating}>{creating ? 'Creating\u2026' : 'Create Backup Now'}</Button>
            </PermissionGate>
            <PermissionGate perm="backup.import">
              <Button variant="ghost" size="sm" icon="download" onClick={() => setImportOpen(true)}>Import</Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      <div className="dmc-db-section">
        <div className="dmc-db-section__head">
          <div className="dmc-db-section__title"><Icon name="refresh" size={18} /> Backup & Recovery</div>
          <div className="dmc-backup-tab-group">
            {tabs.map((t) => (
              <button key={t} className={`dmc-backup-tab${tab === t ? ' dmc-backup-tab--active' : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="dmc-db-section__body">
            <div className="dmc-db-stats-row">
              {[
                { label: 'Total Backups', value: backups.length, sub: 'All time', variant: 'indigo', icon: 'refresh' },
                { label: 'Protected', value: String(stats?.protectedCount || 0), sub: 'Safe from cleanup', variant: 'green', icon: 'shield' },
                { label: 'Total Size', value: bytes(stats?.totalBytes || 0), sub: 'Storage used', variant: 'blue', icon: 'archive' },
                { label: 'Last Backup', value: stats?.lastBackup ? formatDateTime(stats.lastBackup) : 'Never', sub: stats?.lastBackup ? 'Latest' : 'No backup', variant: 'amber', icon: 'clock' },
              ].map((c) => (
                <div key={c.label} className="dmc-db-statcard">
                  <div className={`dmc-db-statcard__icon dmc-db-statcard__icon--${c.variant}`}><Icon name={c.icon} size={18} /></div>
                  <div className="dmc-db-statcard__body">
                    <div className="dmc-db-statcard__label">{c.label}</div>
                    <div className="dmc-db-statcard__value">{c.value}</div>
                    <div className="dmc-db-statcard__sub">{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <BackupHistoryTable backups={backups.slice(0, 5)} can={can} onRestore={(b) => setRestoreTarget(b)} actor={user} toast={toast} onChanged={refresh} />
            {backups.length > 5 && (
              <div className="text-center mt-12">
                <Button variant="ghost" size="sm" onClick={() => setTab('history')}>View All ({backups.length})</Button>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="dmc-db-section__body">
            <BackupHistoryTable backups={backups} can={can} onRestore={(b) => setRestoreTarget(b)} actor={user} toast={toast} onChanged={refresh} limit={0} />
          </div>
        )}

        {tab === 'settings' && (
          <div className="dmc-db-section__body">
            <div className="flex-row items-center gap-8 mb-8">
              <Icon name="gear" size={18} />
              <strong>Backup Settings</strong>
            </div>
            <p className="text-soft fs-14 mb-12">Configure backup retention, scheduling, and storage options.</p>
            <Button variant="primary" size="sm" onClick={() => nav('/admin/backup/settings')}>Open Settings</Button>
          </div>
        )}

        {tab === 'restore' && (
          <div className="dmc-db-section__body">
            <div className="flex-row items-center gap-8 mb-8">
              <Icon name="history" size={18} />
              <strong>Restore Database</strong>
            </div>
            <p className="text-soft fs-14 mb-12">Select a backup to restore from the history table above, then click Restore.</p>
            {backups.length > 0 ? (
              <BackupHistoryTable backups={backups} can={can} onRestore={(b) => setRestoreTarget(b)} actor={user} toast={toast} onChanged={refresh} limit={0} />
            ) : (
              <div className="dmc-empty">
                <div className="dmc-empty__icon"><Icon name="history" size={32} /></div>
                <div className="dmc-empty__title">No backups yet</div>
              </div>
            )}
          </div>
        )}
      </div>

      {restoreTarget && <RestoreBackupModal backup={restoreTarget} open={!!restoreTarget} actor={user} onClose={() => setRestoreTarget(null)} onRestored={onRestored} />}
      {importOpen && <ImportBackupModal open={importOpen} actor={user} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); refresh(); }} />}
    </>
  );
}
