import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Select } from '@/components/Field.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

export default function RestoreCenter() {
  const [backups, setBackups] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [restoreType, setRestoreType] = useState('full');
  const [restoring, setRestoring] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const all = backupLogic.list();
    setBackups(Array.isArray(all) ? all : []);
    const h = (Array.isArray(all) ? all : []).filter(
      (b) => b.type === 'restore' || b.status === 'restored'
    );
    setHistory(h);
  }, []);

  const handleRestore = async () => {
    if (!selectedFile) {
      toast.push('Please select a backup file.', 'error');
      return;
    }
    setRestoring(true);
    const r = await backupLogic.restore(selectedFile, { name: 'system' });
    if (r && r.ok) {
      toast.push(`Restore completed: ${r.data?.name || ''}`, 'success');
    } else {
      toast.push(r?.error || 'Restore failed.', 'error');
    }
    setRestoring(false);
  };

  return (
    <div>
      <PageHeader icon="refresh" title="Restore Center" subtitle="Restore the database from a backup file." />
      <Card title="Restore from Backup">
        <p className="text-muted">Select a backup file to restore the database.</p>
        <div className="field">
          <label className="field__label">Backup File</label>
          <Select value={selectedFile} onChange={(e) => setSelectedFile(e.target.value)}>
            <option value="">Select a backup...</option>
            {backups.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.createdAt || ''})
              </option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label className="field__label">Restore Type</label>
          <Select value={restoreType} onChange={(e) => setRestoreType(e.target.value)}>
            <option value="full">Full Restore</option>
            <option value="schema">Schema Only</option>
            <option value="data">Data Only</option>
          </Select>
        </div>
        <div className="alert alert--warning">
          This action will overwrite current data. Ensure you have a recent backup.
        </div>
        <Button onClick={handleRestore} disabled={restoring || !selectedFile}>
          {restoring ? 'Restoring...' : 'Start Restore'}
        </Button>
      </Card>
      <Card title="Restore History">
        {history.length === 0 ? (
          <div className="empty-state">
            <Icon name="refresh" size={24} />
            <p>No restore operations yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Backup File</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.createdAt || ''}</td>
                  <td>{h.name}</td>
                  <td>{h.type || 'full'}</td>
                  <td>
                    <span className={`badge badge--${h.status === 'Completed' ? 'success' : 'danger'}`}>
                      {h.status || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
