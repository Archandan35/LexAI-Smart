import { useNavigate } from 'react-router-dom';
import { useBackups } from '@/hooks/useBackups.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import BackupHistoryTable from '@/components/BackupHistoryTable.jsx';
import RestoreBackupModal from '@/components/RestoreBackupModal.jsx';

export default function BackupHistory() {
  const { backups, refresh } = useBackups();
  const { user } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();
  const nav = useNavigate();
  const [restoreTarget, setRestoreTarget] = useState(null);

  const onRestored = (res) => {
    setRestoreTarget(null);
    if (res.ok) { toast.push('Database restored. Reloading…', 'success'); setTimeout(() => window.location.reload(), 900); }
    else toast.push(res.error, 'error');
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="history"
        title="Backup History"
        subtitle="Every system snapshot, with restore, export, protect and delete."
        actions={<Button variant="ghost" icon="arrow" onClick={() => nav('/admin/backup')}>Back</Button>}
      />
      <Card bodyClass="card__body--flush">
        <BackupHistoryTable
          backups={backups}
          actor={user}
          can={can}
          onChanged={refresh}
          onRestore={(b) => setRestoreTarget(b)}
          toast={toast}
        />
      </Card>
      <RestoreBackupModal backup={restoreTarget} open={!!restoreTarget} actor={user} onClose={() => setRestoreTarget(null)} onRestored={onRestored} />
    </div>
  );
}
