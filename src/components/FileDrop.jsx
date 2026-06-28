import Icon from './Icon.jsx';
import { bytes } from '@/utils/format.js';

// Drag-and-drop file picker. Emits the raw File to onFile; the OCR/storage layers
// handle extraction — this component contains no provider logic.
export default function FileDrop({ onFile, accept = '.pdf,.docx,.doc,.png,.jpg,.jpeg,.txt', hint }) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(null);

  const handle = (file) => {
    if (!file) return;
    setName(`${file.name} · ${bytes(file.size)}`);
    onFile(file);
  };

  return (
    <div
      className="card"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => ref.current?.click()}
      style={{
        cursor: 'pointer', textAlign: 'center', padding: '30px 20px',
        borderStyle: 'dashed', borderColor: over ? 'var(--navy-600)' : 'var(--border-strong)',
        background: over ? 'var(--brand-soft)' : 'var(--surface-2)', transition: 'all 0.2s',
      }}
    >
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => handle(e.target.files[0])} />
      <div className="empty__icon" style={{ margin: '0 auto 12px' }}><Icon name="upload" size={24} /></div>
      <div style={{ fontWeight: 650, color: 'var(--navy-800)' }}>{name || 'Drop a file or click to upload'}</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 5 }}>{hint || accept.replaceAll('.', '').toUpperCase()}</div>
    </div>
  );
}
