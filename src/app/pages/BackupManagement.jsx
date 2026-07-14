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

export default function BackupManagement() {
  const { formatDateTime } = useFormat();
  const { backups, stats, refresh } = useBackups();
  const { user } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();
  const nav = useNavigate();

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const createNow = async () => {
    setCreating(true);
    const res = await backupLogic.create({ type: 'manual' }, user);
    setCreating(false);
    if (res.ok) {
      const removed = res.data.removed?.length ? ` · ${res.data.removed.length} old removed` : '';
      toast.push(`Backup created (${bytes(res.data.backup.size)}, ${res.data.backup.durationMs}ms)${removed}.`, 'success');
      refresh();
    } else toast.push(res.error, 'error');
  };

  const onRestored = (res) => {
    setRestoreTarget(null);
    if (res.ok) { toast.push('Database restored. Reloading…', 'success'); setTimeout(() => window.location.reload(), 900); }
    else toast.push(res.error, 'error');
  };
  const onImported = (res, restored) => {
    if (res.ok) { toast.push(restored ? 'Imported & restored. Reloading…' : 'Backup imported.', 'success'); refresh(); if (restored) setTimeout(() => window.location.reload(), 900); }
    else toast.push(res.error, 'error');
  };

  const STAT_CARDS = stats ? [
    { label: 'Total Backups', value: stats.total, icon: 'database' },
    { label: 'Protected', value: stats.protectedCount, icon: 'shield' },
    { label: 'Storage Used', value: bytes(stats.totalBytes), icon: 'layers' },
    { label: 'Retention', value: stats.retention === 'unlimited' ? '∞' : stats.retention, icon: 'history' },
    { label: 'Last Backup', value: stats.lastBackup ? formatDateTime(stats.lastBackup) : '—', icon: 'clock', wide: true },
    { label: 'Schedule', value: stats.frequency === 'manual' ? 'Manual' : `${stats.frequency} · ${stats.time}`, icon: 'calendar' },
  ] : [];

  return (
    <div className="fade-in">
      <PageHeader
        icon="database"
        title="Backup & Recovery"
        subtitle="Full-system UDB snapshots, retention, protection and restore."
        actions={(
          <>
            <PermissionGate perm="backup.import"><Button variant="ghost" icon="upload" onClick={() => setImportOpen(true)}>Import</Button></PermissionGate>
            <PermissionGate perm="backup.settings"><Button variant="ghost" icon="gear" onClick={() => nav('/admin/backup/settings')}>Settings</Button></PermissionGate>
            <PermissionGate perm="backup.create"><Button variant="primary" icon="plus" loading={creating} onClick={createNow}>Create Backup Now</Button></PermissionGate>
          </>
        )}
      />

      <div className="alert alert--info backup-mgmt__alert-mb">
        <Icon name="alert" size={16} />
        <span>Backups snapshot the active database provider (provider-agnostic). In this demo “compression/encryption” are simulated flags. Connect a backend destination for real off-site, encrypted backups.</span>
      </div>

      <div className="stat-grid">
        {STAT_CARDS.map((s) => (
          <div className="stat-card" key={s.label} style={s.wide ? { gridColumn: 'span 1' } : undefined}>
            <div className="stat-card__icon"><Icon name={s.icon} size={20} /></div>
            <div className={`stat-card__value${s.wide ? ' stat-card__value--sm' : ' stat-card__value--lg'}`}>{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <Card
        title="Backup History"
        sub="All system snapshots"
        actions={<Button variant="ghost" size="sm" icon="history" onClick={() => nav('/admin/backup/history')}>Full history</Button>}
        bodyClass="card__body--flush"
      >
        <BackupHistoryTable
          backups={backups}
          actor={user}
          can={can}
          onChanged={refresh}
          onRestore={(b) => setRestoreTarget(b)}
          toast={toast}
          limit={6}
        />
      </Card>

      <RestoreBackupModal backup={restoreTarget} open={!!restoreTarget} actor={user} onClose={() => setRestoreTarget(null)} onRestored={onRestored} />
      <ImportBackupModal open={importOpen} actor={user} onClose={() => setImportOpen(false)} onImported={onImported} />
    </div>
  );
}

