import { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import { useFormat } from '@/utils/format.js';

// RestoreBackupModal — confirmation + integrity check + restore preview before
// replacing the current database.
export default function RestoreBackupModal({ backup, open, onClose, onRestored, actor }) {
  const [integrity, setIntegrity] = useState(null);
  const [busy, setBusy] = useState(false);
  const { formatDateTime } = useFormat();

  useEffect(() => {
    if (open && backup) { setIntegrity(null); backupLogic.verify(backup.id).then(setIntegrity); }
  }, [open, backup]);

  if (!backup) return null;

  const restore = async () => {
    setBusy(true);
    const res = await backupLogic.restore(backup.id, actor);
    setBusy(false);
    onRestored?.(res);
  };

  return (
    <Modal
      open={open}
      title="Restore Backup"
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" icon="history" loading={busy} disabled={integrity && !integrity.valid} onClick={restore}>Restore entire database</Button>
        </>
      )}
    >
      <div className="alert alert--warn restore-alert">
        <Icon name="alert" size={16} />
        <span>The current database will be <b>completely replaced</b> with this snapshot. Existing unsaved data will be lost. Other backups are preserved.</span>
      </div>

      <div className="kv"><span>Backup</span><b>{backup.name}</b></div>
      <div className="kv"><span>Created</span><span>{formatDateTime(backup.createdAt)}</span></div>
      <div className="kv"><span>App / Schema</span><span>v{backup.appVersion} · schema {backup.schemaVersion}</span></div>

      <div className="restore-preview-title">Restore preview</div>
      <div className="chips">
        {Object.entries(backup.counts || {}).map(([k, v]) => (
          <span key={k} className="tag">{k}: <b className="restore-count">{v}</b></span>
        ))}
      </div>

      <div className="restore-checks">
        {!integrity ? (
          <div className="loading-block restore-loading"><span className="spinner" /> Verifying integrity…</div>
        ) : (
          <div className={`alert ${integrity.valid ? 'alert--success' : 'alert--danger'}`}>
            <Icon name={integrity.valid ? 'check' : 'alert'} size={16} />
            <span>{integrity.valid ? 'Valid backup — checksum verified (SHA-256).' : `Corrupted backup — ${integrity.reason}`}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

