import { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { backupLogic } from '@/logic/backupLogic.js';

// ImportBackupModal — accept a .udb file, validate integrity + version, then
// import as a backup or restore immediately.
export default function ImportBackupModal({ open, onClose, onImported, actor }) {
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setParsed(null); setFileName(''); setError(''); };
  const close = () => { reset(); onClose?.(); };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setError('');
    const text = await file.text();
    const result = await backupLogic.parseImport(text);
    if (!result.ok) { setError(result.reason); setParsed(null); return; }
    setParsed(result);
  };

  const doImport = async (restoreNow) => {
    if (!parsed) return;
    setBusy(true);
    const res = await backupLogic.importBackup(parsed.snapshot, { restoreNow }, actor);
    setBusy(false);
    onImported?.(res, restoreNow);
    close();
  };

  return (
    <Modal
      open={open}
      title="Import Backup"
      onClose={close}
      footer={parsed && (
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="ghost" icon="download" loading={busy} onClick={() => doImport(false)}>Import as backup only</Button>
          <Button variant="primary" icon="history" loading={busy} onClick={() => doImport(true)}>Import &amp; restore now</Button>
        </>
      )}
    >
      <label className="filedrop">
        <input type="file" accept=".udb,application/json" onChange={onFile} hidden />
        <Icon name="upload" size={26} />
        <div className="filedrop__file-name">{fileName || 'Choose a .udb backup file'}</div>
        <div className="filedrop__hint">Integrity and version are checked before import.</div>
      </label>

      {error && <div className="alert alert--danger import-error"><Icon name="alert" size={16} />{error}</div>}

      {parsed && (
        <div className="import-preview">
          <div className={`alert ${parsed.checksumOk && parsed.versionOk ? 'alert--success' : 'alert--warn'}`}>
            <Icon name={parsed.checksumOk && parsed.versionOk ? 'check' : 'alert'} size={16} />
            <span>{parsed.reason}</span>
          </div>
          <div className="kv import-kv"><span>Format</span><b>UDB v{parsed.snapshot.udbVersion}</b></div>
          <div className="kv"><span>App / Schema</span><span>v{parsed.snapshot.appVersion} · schema {parsed.snapshot.schemaVersion}</span></div>
          <div className="chips import-chips">
            {Object.entries(parsed.snapshot.counts || {}).map(([k, v]) => <span key={k} className="tag">{k}: <b className="import-count">{v}</b></span>)}
          </div>
        </div>
      )}
    </Modal>
  );
}

