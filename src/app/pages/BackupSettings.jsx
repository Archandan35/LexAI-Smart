import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { backupLogic } from '@/logic/backupLogic.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Toggle from '@/components/Toggle.jsx';
import { Field, Input, Select } from '@/components/Field.jsx';

const RETENTION_OPTIONS = [3, 5, 10, 20, 'unlimited'];
const FREQS = ['hourly', 'daily', 'weekly', 'monthly', 'manual'];

export default function BackupSettings() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();
  const nav = useNavigate();
  const [s, setS] = useState(backupLogic.getSettings());
  const [busy, setBusy] = useState(false);

  const readOnly = !can('backup.settings');
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setBusy(true);
    const res = await backupLogic.saveSettings(s, user);
    setBusy(false);
    if (res.ok) toast.push('Backup settings saved.', 'success'); else toast.push(res.error, 'error');
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="gear"
        title="Backup Settings"
        subtitle="Retention policy, schedule and backup behaviour."
        actions={<Button variant="ghost" icon="arrow" onClick={() => nav('/admin/backup')}>Back</Button>}
      />

      <div className="grid-2">
        <Card title="Retention policy">
          <Field label="Maximum stored backups" hint="Oldest non-protected backup is removed when the limit is exceeded (FIFO).">
            <Select value={String(s.retention)} disabled={readOnly} onChange={(e) => set({ retention: e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value) })}>
              {RETENTION_OPTIONS.map((o) => <option key={o} value={String(o)}>{o === 'unlimited' ? 'Unlimited' : `${o} backups`}</option>)}
            </Select>
          </Field>
          <div className="kv"><span>Auto cleanup</span><Toggle checked={s.autoCleanup} disabled={readOnly} onChange={(v) => set({ autoCleanup: v })} /></div>
          <div className="kv"><span>Protected backups</span><span className="backup-settings__soft-text">Never auto-deleted</span></div>
          <Field label="Storage limit (MB)" hint="Soft limit shown on the dashboard.">
            <Input type="number" min="1" value={s.storageLimitMb} disabled={readOnly} onChange={(e) => set({ storageLimitMb: Number(e.target.value) })} />
          </Field>
        </Card>

        <Card title="Schedule & behaviour">
          <div className="input-row">
            <Field label="Frequency">
              <Select value={s.frequency} disabled={readOnly} onChange={(e) => set({ frequency: e.target.value })}>
                {FREQS.map((f) => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
              </Select>
            </Field>
            <Field label="Time">
              <Input type="time" value={s.time} disabled={readOnly || s.frequency === 'manual' || s.frequency === 'hourly'} onChange={(e) => set({ time: e.target.value })} />
            </Field>
          </div>
          <div className="kv"><span>Compression <span className="muted">(simulated)</span></span><Toggle checked={s.compression} disabled={readOnly} onChange={(v) => set({ compression: v })} /></div>
          <div className="kv"><span>Encryption <span className="muted">(simulated)</span></span><Toggle checked={s.encryption} disabled={readOnly} onChange={(v) => set({ encryption: v })} /></div>
          <div className="kv"><span>Notifications</span><Toggle checked={s.notifications} disabled={readOnly} onChange={(v) => set({ notifications: v })} /></div>
          <div className="alert alert--warn backup-settings__warn-alert">
            Scheduling is configured here but, with no backend, automated runs require the app to be open. Compression/encryption are flags only in this demo.
          </div>
        </Card>
      </div>

      {!readOnly && (
        <div className="backup-settings__actions">
          <Button variant="primary" icon="save" loading={busy} onClick={save}>Save settings</Button>
        </div>
      )}
    </div>
  );
}
