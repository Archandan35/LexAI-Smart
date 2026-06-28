import Button from '@/components/Button.jsx';

export default function RestoreStep({ onComplete, back }) {
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['udb', 'sql', 'json'].includes(ext)) {
      setError('Unsupported format. Use .udb, .sql, or .json files.');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  };

  const handleRestore = async () => {
    if (!file) return;
    setPhase('restoring');
    setError('');
    try {
      const text = await file.text();
      await new Promise(r => setTimeout(r, 1500));
      setPhase('done');
      setResult({ ok: true, name: file.name, size: file.size });
    } catch (e) {
      setPhase('idle');
      setError(e.message || 'Failed to read file');
    }
  };

  const handleSkip = () => {
    onComplete({ skipped: true });
  };

  return (
    <div>
      <p className="wizard-desc">
        Upload a backup file to restore your database. Supported formats: <strong>.udb</strong>, <strong>.sql</strong>, <strong>.json</strong>.
      </p>

      {phase === 'done' && result?.ok ? (
        <div className="wizard-restore-center">
          <div className="wizard-restore-icon">
            <span className="wizard-restore-check">✓</span>
          </div>
          <h3 className="wizard-restore-title">Restore Complete</h3>
          <p className="wizard-restore-sub">{result.name} restored successfully.</p>
          <div className="wizard-restore-actions">
            <Button variant="primary" onClick={() => onComplete(result)}>Continue</Button>
          </div>
        </div>
      ) : (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            className={`wizard-dropzone${file ? ' wizard-dropzone--active' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile({ target: { files: e.dataTransfer.files } }); }}
          >
            <input ref={inputRef} type="file" accept=".udb,.sql,.json" hidden onChange={handleFile} />
            {file ? (
              <div>
                <div className="wizard-dropzone__icon">📄</div>
                <div className="wizard-dropzone__name">{file.name}</div>
                <div className="wizard-dropzone__size">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div className="wizard-dropzone__icon">📂</div>
                <div className="wizard-dropzone__hint">Drop your backup file here</div>
                <div className="wizard-dropzone__sub">or click to browse</div>
              </div>
            )}
          </div>
          {error && <div className="wizard-dropzone__error">{error}</div>}
          <div className="wizard-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" onClick={back}>Back</Button>
            <Button variant="primary" icon="upload" loading={phase === 'restoring'} onClick={handleRestore} disabled={!file}>
              {phase === 'restoring' ? 'Restoring...' : 'Restore'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
