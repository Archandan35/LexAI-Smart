import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackups } from '@/hooks/useBackups.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
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
      <PageHeader icon="refresh" title="Backup & Recovery" subtitle="Create, restore, schedule, and manage database backups.">
        <PermissionGate perm="backup.create">
          <Button variant="primary" icon="plus" onClick={createNow} disabled={creating}>{creating ? 'Creating…' : 'Create Backup Now'}</Button>
        </PermissionGate>
        <PermissionGate perm="backup.import">
          <Button variant="ghost" icon="download" onClick={() => setImportOpen(true)}>Import</Button>
        </PermissionGate>
      </PageHeader>

      <div className="dmc-backup-tabs">
        {tabs.map((t) => (
          <button key={t} className={`dmc-tab dmc-tab-underline${tab === t ? ' dmc-tab--active' : ''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="dmc-backup-grid">
            <Card title="Total Backups" sub={String(backups.length)} />
            <Card title="Protected" sub={String(stats?.protectedCount || 0)} />
            <Card title="Total Size" sub={bytes(stats?.totalBytes || 0)} />
            <Card title="Last Backup" sub={stats?.lastBackup ? formatDateTime(stats.lastBackup) : 'Never'} />
          </div>
          <BackupHistoryTable backups={backups.slice(0, 5)} can={can} onRestore={(b) => setRestoreTarget(b)} actor={user} toast={toast} onChanged={refresh} />
          {backups.length > 5 && (
            <div className="dmc-backup-view-all">
              <Button variant="ghost" size="sm" onClick={() => setTab('history')}>View All ({backups.length})</Button>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <BackupHistoryTable backups={backups} can={can} onRestore={(b) => setRestoreTarget(b)} actor={user} toast={toast} onChanged={refresh} limit={0} />
      )}

      {tab === 'settings' && (
        <div className="dmc-section">
          <div className="dmc-section__title"><Icon name="gear" size={17} /> Backup Settings</div>
          <p className="dmc-section-desc">Configure backup retention, scheduling, and storage options.</p>
          <Button variant="primary" size="sm" onClick={() => nav('/admin/backup/settings')}>Open Settings</Button>
        </div>
      )}

      {tab === 'restore' && (
        <div className="dmc-section">
          <div className="dmc-section__title"><Icon name="history" size={17} /> Restore Database</div>
          <p className="dmc-section-desc">Select a backup to restore from the history table above, then click Restore.</p>
          {backups.length > 0 ? (
            <BackupHistoryTable backups={backups} can={can} onRestore={(b) => setRestoreTarget(b)} actor={user} toast={toast} onChanged={refresh} limit={0} />
          ) : (
            <div className="dmc-empty"><div className="dmc-empty__icon"><Icon name="history" size={32} /></div><div className="dmc-empty__title">No backups yet</div></div>
          )}
        </div>
      )}

      {restoreTarget && <RestoreBackupModal backup={restoreTarget} open={!!restoreTarget} actor={user} onClose={() => setRestoreTarget(null)} onRestored={onRestored} />}
      {importOpen && <ImportBackupModal open={importOpen} actor={user} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); refresh(); }} />}
    </>
  );
}
