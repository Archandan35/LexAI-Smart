import Button from '@/components/Button.jsx';
import { ConnectionManager } from '@/services/setup/ConnectionManager.js';
import StatusBadge from '../wizard/StatusBadge.jsx';

const PROVIDER_FIELDS = {
  supabase: [
    { key: 'url', label: 'Project URL', type: 'text', placeholder: 'https://your-project.supabase.co' },
    { key: 'key', label: 'API Key', type: 'password', placeholder: 'anon/public API key' },
  ],
  postgresql: [
    { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', defaultValue: 'localhost' },
    { key: 'port', label: 'Port', type: 'text', placeholder: '5432', defaultValue: '5432' },
    { key: 'database', label: 'Database', type: 'text', placeholder: 'lexai' },
    { key: 'user', label: 'Username', type: 'text', placeholder: 'postgres' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
    { key: 'ssl', label: 'SSL', type: 'checkbox', defaultChecked: true },
  ],
  mysql: [
    { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', defaultValue: 'localhost' },
    { key: 'port', label: 'Port', type: 'text', placeholder: '3306', defaultValue: '3306' },
    { key: 'database', label: 'Database', type: 'text', placeholder: 'lexai' },
    { key: 'user', label: 'Username', type: 'text', placeholder: 'root' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
  ],
  sqlite: [
    { key: 'path', label: 'Database File Path', type: 'text', placeholder: '/data/lexai.db' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['Read-Write', 'Read-Only', 'Memory'], defaultValue: 'Read-Write' },
  ],
  sqlserver: [
    { key: 'host', label: 'Server', type: 'text', placeholder: 'localhost' },
    { key: 'port', label: 'Port', type: 'text', placeholder: '1433', defaultValue: '1433' },
    { key: 'database', label: 'Database', type: 'text', placeholder: 'lexai' },
    { key: 'user', label: 'Username', type: 'text', placeholder: 'sa' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
    { key: 'trustServerCertificate', label: 'Trust Server Certificate', type: 'checkbox', defaultChecked: false },
  ],
};

export default function ConnectionStep({ method, onConnected, back }) {
  const [provider, setProvider] = useState('supabase');
  const [fields, setFields] = useState({});
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  const currentFields = PROVIDER_FIELDS[provider] || PROVIDER_FIELDS.supabase;

  const updateField = (key, value) => setFields(prev => ({ ...prev, [key]: value }));

  const handleTest = async () => {
    setTesting(true); setStatus(null);
    const credentials = { provider, ...fields };
    const res = await ConnectionManager.test(method, credentials);
    setStatus(res);
    setTesting(false);
    if (res.ok) setTimeout(() => onConnected(credentials), 800);
  };

  const allFilled = currentFields.every(f => {
    if (f.type === 'checkbox') return true;
    return fields[f.key] || (f.defaultValue && !fields[f.key]);
  });

  return (
    <div>
      <p className="wizard-desc">
        {method === 'simple'
          ? 'Select your provider and enter connection details.'
          : 'Enter your database connection details for the selected provider.'}
      </p>

      {!method && (
        <div style={{ marginBottom: 16 }}>
          <label className="wizard-form-label" style={{ marginBottom: 6 }}>Database Provider</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.keys(PROVIDER_FIELDS).map(p => (
              <button key={p} onClick={() => { setProvider(p); setFields({}); setStatus(null); }}
                className={`wizard-provider-btn${provider === p ? ' wizard-provider-btn--active' : ' wizard-provider-btn--inactive'}`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="wizard-form-group">
        {currentFields.map(f => (
          <div key={f.key}>
            <label className="wizard-form-label">{f.label}</label>
            {f.type === 'checkbox' ? (
              <label className="wizard-form-checkbox">
                <input type="checkbox" checked={fields[f.key] ?? f.defaultChecked ?? false}
                  onChange={e => updateField(f.key, e.target.checked)} />
                Enable SSL
              </label>
            ) : f.type === 'select' ? (
              <select value={fields[f.key] || f.defaultValue || ''}
                onChange={e => updateField(f.key, e.target.value)}
                className="wizard-form-input"
              >
                {f.options?.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <div>
                <input value={fields[f.key] || f.defaultValue || ''}
                  onChange={e => updateField(f.key, e.target.value)}
                  type={f.type} placeholder={f.placeholder}
                  className="wizard-form-input" />
              </div>
            )}
          </div>
        ))}
      </div>

      {status && (
        <div className={`wizard-status-box${status.ok ? ' wizard-status-box--green' : ' wizard-status-box--red'}`}>
          <div className="wizard-status-row">
            <StatusBadge status={status.ok ? 'ok' : 'fail'} label={status.ok ? 'Connected' : 'Failed'} />
            <span className="wizard-status-text">{status.ok ? 'Connection successful' : status.error}</span>
          </div>
        </div>
      )}

      <div className="wizard-actions" style={{ marginTop: 24 }}>
        <Button variant="ghost" onClick={back}>Back</Button>
        <Button variant="primary" icon="bolt" loading={testing} onClick={handleTest} disabled={!allFilled}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
      </div>
    </div>
  );
}
